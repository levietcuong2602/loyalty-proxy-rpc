import {
  Injectable,
  InternalServerErrorException,
  Logger,
} from '@nestjs/common';
import axios, { AxiosError } from 'axios';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class RpcService {
  private readonly logger = new Logger(RpcService.name);
  private readonly endpoints: string[];
  private currentEndpointIndex = 0;
  private readonly endpointStatus: {
    isAvailable: boolean;
    lastErrorTime: number | null;
    errorCount: number;
  }[];
  private readonly RECOVERY_TIME = 5 * 60 * 1000;

  constructor(private readonly configService: ConfigService) {
    this.endpoints =
      this.configService.get<string[]>('avalancheRpcEndpoints') || [];
    this.endpointStatus = this.endpoints.map(() => ({
      isAvailable: true,
      lastErrorTime: null,
      errorCount: 0,
    }));
  }

  private isRateLimitExceeded(error: AxiosError): boolean {
    if (!error || !error.response) return false;
    if (error.response.status === 429) return true;
    const errorMsg = (error.response.data as any)?.error?.message || '';
    return (
      errorMsg.includes('exceeded') ||
      errorMsg.includes('rate limit') ||
      errorMsg.includes('too many requests')
    );
  }

  private getNextAvailableEndpoint(): string {
    let checked = 0;
    const total = this.endpoints.length;
    let idx = this.currentEndpointIndex;
    while (checked < total) {
      const status = this.endpointStatus[idx];
      this.logger.log('endpoint status:', JSON.stringify(status));

      if (status.isAvailable) {
        this.currentEndpointIndex = idx;
        return this.endpoints[idx];
      }
      if (
        status.lastErrorTime &&
        Date.now() - status.lastErrorTime > this.RECOVERY_TIME
      ) {
        status.isAvailable = true;
        status.errorCount = 0;
        this.currentEndpointIndex = idx;
        return this.endpoints[idx];
      }
      idx = (idx + 1) % total;
      checked++;
    }
    // If all endpoints are unavailable, start again from the first
    this.currentEndpointIndex = 0;
    return this.endpoints[0];
  }

  private markCurrentEndpointUnavailable() {
    const status = this.endpointStatus[this.currentEndpointIndex];
    status.isAvailable = false;
    status.lastErrorTime = Date.now();
    status.errorCount++;
    this.logger.warn(
      `Endpoint ${this.currentEndpointIndex} marked unavailable due to rate limit. Switching...`,
    );
  }

  async forwardRpcRequest(body: any): Promise<{ status: number; data: any }> {
    let retries = 0;
    const MAX_RETRIES = this.endpoints.length;
    while (retries < MAX_RETRIES) {
      const currentEndpoint = this.getNextAvailableEndpoint();
      try {
        this.logger.log(
          `Forwarding request to endpoint ${this.currentEndpointIndex}: ${currentEndpoint}`,
        );
        const response = await axios.post(currentEndpoint, body, {
          headers: { 'Content-Type': 'application/json' },
        });
        this.logger.log(
          `Response from ${currentEndpoint}: Status ${response.status}`,
        );
        return response.data;
      } catch (error) {
        if (this.isRateLimitExceeded(error as AxiosError)) {
          this.logger.warn(
            `Rate limit exceeded for endpoint ${this.currentEndpointIndex}`,
          );
          this.markCurrentEndpointUnavailable();
          retries++;
          continue;
        } else {
          if ((error as AxiosError).response) {
            throw new InternalServerErrorException(
              `RPC Error: ${(error as Error).message}`,
            );
          }
          throw new InternalServerErrorException(
            `RPC Error: ${(error as Error).message}`,
          );
        }
      }
    }
    throw new InternalServerErrorException(
      'All RPC endpoints are currently unavailable due to rate limits',
    );
  }

  getHealth() {
    const availableEndpoints = this.endpointStatus.filter(
      (s) => s.isAvailable,
    ).length;
    return {
      status: 'ok',
      availableEndpoints,
      totalEndpoints: this.endpoints.length,
      currentEndpoint: this.currentEndpointIndex,
      uptime: process.uptime(),
      memory: process.memoryUsage(),
    };
  }
}
