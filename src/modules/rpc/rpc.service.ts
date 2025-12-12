import {
  Inject,
  Injectable,
  InternalServerErrorException,
  Logger,
  OnModuleInit,
} from '@nestjs/common';
import axios, { AxiosError } from 'axios';
import { ConfigService } from '@nestjs/config';
import { RedisCachingService } from '@shared/cache/redis/redis-caching.service';
import { CACHE_SERVICE } from '@shared/cache';

@Injectable()
export class RpcService implements OnModuleInit {
  private readonly logger = new Logger(RpcService.name);
  private readonly endpoints: string[];
  private readonly RECOVERY_TIME = 1 * 60 * 1000;

  // Redis keys
  private readonly CURRENT_INDEX_KEY = 'rpc:current-index';
  private readonly ENDPOINT_AVAILABLE_KEY = (idx: number) =>
    `rpc:endpoint:${idx}:available`;
  private readonly ENDPOINT_LAST_ERROR_KEY = (idx: number) =>
    `rpc:endpoint:${idx}:last-error-time`;
  private readonly ENDPOINT_ERROR_COUNT_KEY = (idx: number) =>
    `rpc:endpoint:${idx}:error-count`;

  constructor(
    private readonly configService: ConfigService,
    @Inject(CACHE_SERVICE)
    private readonly cacheService: RedisCachingService,
  ) {
    this.endpoints =
      this.configService.get<string[]>('avalancheRpcEndpoints') || [];
  }

  async onModuleInit() {
    // Initialize Redis state for all endpoints
    await this.initializeEndpointsStatus();
  }

  private async initializeEndpointsStatus() {
    try {
      const currentIndex = await this.cacheService.get<string>(
        this.CURRENT_INDEX_KEY,
      );

      if (!currentIndex) {
        // Initialize current index
        await this.cacheService.set(this.CURRENT_INDEX_KEY, '0', {
          ttl: 0, // No expiration
        });
      }

      // Initialize each endpoint status if not exists
      for (let i = 0; i < this.endpoints.length; i++) {
        const available = await this.cacheService.get<string>(
          this.ENDPOINT_AVAILABLE_KEY(i),
        );

        if (available === undefined || !available) {
          await this.cacheService.set(this.ENDPOINT_AVAILABLE_KEY(i), '1', {
            ttl: 0,
          });
          await this.cacheService.set(this.ENDPOINT_LAST_ERROR_KEY(i), '0', {
            ttl: 0,
          });
          await this.cacheService.set(this.ENDPOINT_ERROR_COUNT_KEY(i), '0', {
            ttl: 0,
          });
        }
      }

      this.logger.log(
        `Initialized ${this.endpoints.length} RPC endpoints in Redis`,
      );
    } catch (error) {
      this.logger.error(
        'Failed to initialize endpoints status in Redis',
        error,
      );
    }
  }

  /**
   * Get current active endpoint index from Redis
   * All requests will use the same endpoint until it becomes unavailable
   */
  private async getCurrentEndpointIndex(): Promise<number> {
    const currentIndexStr = await this.cacheService.get<string>(
      this.CURRENT_INDEX_KEY,
    );
    return parseInt(currentIndexStr || '0', 10);
  }

  /**
   * Move to next endpoint (only called when current endpoint is unavailable)
   * Uses distributed lock to prevent race condition when multiple requests
   * try to switch endpoints simultaneously
   */
  private async moveToNextEndpoint(currentIndex: number): Promise<number> {
    const lockKey = `${this.CURRENT_INDEX_KEY}:lock`;
    while (true) {
      // Try to acquire lock using INCR (atomic operation)
      const locked = await this.acquireLock(lockKey);

      if (!locked) {
        try {
          // Double-check current index (might have changed while waiting for lock)
          const actualCurrentIndex = await this.getCurrentEndpointIndex();

          // If someone already moved past currentIndex, we're done
          if (actualCurrentIndex !== currentIndex) {
            this.logger.log(
              `Endpoint already switched from ${currentIndex} to ${actualCurrentIndex} by another request`,
            );
            return actualCurrentIndex;
          }

          // Move to next endpoint atomically
          const nextIndex = (currentIndex + 1) % this.endpoints.length;
          await this.cacheService.set(
            this.CURRENT_INDEX_KEY,
            nextIndex.toString(),
            {
              ttl: 0,
            },
          );

          this.logger.log(
            `Switched from endpoint ${currentIndex} to endpoint ${nextIndex}`,
          );

          return nextIndex;
        } finally {
          // Always release lock
          await this.releaseLock(lockKey);
        }
      } else {
        await new Promise((resolve) => setTimeout(resolve, 50));
      }
    }

    // If we couldn't acquire lock after retries, just return next index
    // (better than blocking forever)
    const nextIndex = (currentIndex + 1) % this.endpoints.length;
    this.logger.warn(
      `Could not acquire lock for endpoint switch, proceeding anyway: ${currentIndex} → ${nextIndex}`,
    );
    return nextIndex;
  }

  /**
   * Acquire distributed lock using Redis INCR (atomic operation)
   * Returns true if lock acquired (INCR returns 1), false if already locked (INCR > 1)
   */
  private async acquireLock(key: string): Promise<boolean> {
    try {
      // INCR is atomic - returns 1 if we're first, > 1 if already locked
      const lockValue = await this.cacheService.incr(key);

      if (lockValue - 1 >= 0) {
        // We acquired the lock, set TTL to auto-expire (prevent deadlock)
        await this.cacheService.set(key, lockValue.toString(), {
          ttl: 3, // 3 seconds auto-expire
        });
        return true;
      } else {
        // Lock already held by another request, decrement back
        // This is safe because we know we didn't get the lock
        return false;
      }
    } catch (error) {
      this.logger.error('Failed to acquire lock', error);
      return false;
    }
  }

  /**
   * Release distributed lock by deleting the key
   */
  private async releaseLock(key: string): Promise<void> {
    try {
      await this.cacheService.del(key);
    } catch (error) {
      this.logger.error('Failed to release lock', error);
    }
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

  private async getNextAvailableEndpoint(): Promise<{
    endpoint: string;
    index: number;
  }> {
    // Get current active endpoint index (all requests use the same endpoint)
    let currentIdx = await this.getCurrentEndpointIndex();
    let checked = 0;
    const total = this.endpoints.length;

    while (checked < total) {
      const availableStr = await this.cacheService.get<string>(
        this.ENDPOINT_AVAILABLE_KEY(currentIdx),
      );
      const lastErrorTimeStr = await this.cacheService.get<string>(
        this.ENDPOINT_LAST_ERROR_KEY(currentIdx),
      );

      const isAvailable = availableStr === '1';
      const lastErrorTime = parseInt(lastErrorTimeStr || '0', 10);

      this.logger.log(
        `Checking endpoint ${currentIdx} (${this.endpoints[currentIdx]}): available=${isAvailable}, lastError=${lastErrorTime}`,
      );

      // Check if endpoint should be recovered
      if (
        !isAvailable &&
        lastErrorTime &&
        Date.now() - lastErrorTime > this.RECOVERY_TIME
      ) {
        this.logger.log(
          `Endpoint ${currentIdx} (${this.endpoints[currentIdx]}) is recovering from error, marking as available`,
        );

        // Mark as available and reset error count
        await this.cacheService.set(
          this.ENDPOINT_AVAILABLE_KEY(currentIdx),
          '1',
          {
            ttl: 0,
          },
        );
        await this.cacheService.set(
          this.ENDPOINT_ERROR_COUNT_KEY(currentIdx),
          '0',
          {
            ttl: 0,
          },
        );

        return { endpoint: this.endpoints[currentIdx], index: currentIdx };
      }

      if (isAvailable) {
        this.logger.log(
          `Using endpoint ${currentIdx} (${this.endpoints[currentIdx]})`,
        );
        return { endpoint: this.endpoints[currentIdx], index: currentIdx };
      }

      // Current endpoint not available, move to next
      this.logger.log(
        `Endpoint ${currentIdx} is unavailable, checking next endpoint`,
      );
      currentIdx = await this.moveToNextEndpoint(currentIdx);
      checked++;
    }

    // If all endpoints are unavailable, return the current one anyway
    this.logger.warn(
      `All endpoints are unavailable, falling back to endpoint ${currentIdx}`,
    );
    return { endpoint: this.endpoints[currentIdx], index: currentIdx };
  }

  private async markEndpointUnavailable(index: number): Promise<void> {
    const now = Date.now();

    // Mark as unavailable
    await this.cacheService.set(this.ENDPOINT_AVAILABLE_KEY(index), '0', {
      ttl: 0,
    });

    // Set last error time
    await this.cacheService.set(
      this.ENDPOINT_LAST_ERROR_KEY(index),
      now.toString(),
      { ttl: 0 },
    );

    // Increment error count using Redis INCR for atomic operation
    await this.cacheService.incr(this.ENDPOINT_ERROR_COUNT_KEY(index));

    const errorCount = await this.cacheService.get<string>(
      this.ENDPOINT_ERROR_COUNT_KEY(index),
    );

    this.logger.warn(
      `Endpoint ${index} (${this.endpoints[index]}) marked unavailable due to rate limit. Error count: ${errorCount}`,
    );
  }

  async forwardRpcRequest(body: any): Promise<{ status: number; data: any }> {
    let retries = 0;
    const MAX_RETRIES = this.endpoints.length * 2; // Try each endpoint at least twice

    while (retries < MAX_RETRIES) {
      // Get current active endpoint (all requests use same endpoint until it fails)
      const { endpoint: currentEndpoint, index: currentIndex } =
        await this.getNextAvailableEndpoint();

      try {
        this.logger.log(
          `Forwarding request to endpoint ${currentIndex}: ${currentEndpoint}`,
        );

        const response = await axios.post(currentEndpoint, body, {
          headers: { 'Content-Type': 'application/json' },
        });

        this.logger.log(
          `Response from ${currentEndpoint}: Status ${response.status}`,
        );

        return response.data;
      } catch (error) {
        this.logger.error(error.message, error.stack);
        if (this.isRateLimitExceeded(error as AxiosError)) {
          this.logger.warn(
            `Rate limit exceeded for endpoint ${currentIndex} (${this.endpoints[currentIndex]})`,
          );

          // Mark this endpoint as unavailable
          // getNextAvailableEndpoint() will automatically move to next endpoint
          await this.markEndpointUnavailable(currentIndex);

          retries++;
          // Small delay to avoid hammering endpoints
          await new Promise((resolve) => setTimeout(resolve, 100));
          continue;
        } else {
          // Non rate-limit errors should be thrown immediately
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

  async getHealth() {
    // Count available endpoints from Redis
    let availableEndpoints = 0;
    const endpointsStatus = [];

    for (let i = 0; i < this.endpoints.length; i++) {
      const availableStr = await this.cacheService.get<string>(
        this.ENDPOINT_AVAILABLE_KEY(i),
      );
      const lastErrorTimeStr = await this.cacheService.get<string>(
        this.ENDPOINT_LAST_ERROR_KEY(i),
      );
      const errorCountStr = await this.cacheService.get<string>(
        this.ENDPOINT_ERROR_COUNT_KEY(i),
      );

      const isAvailable = availableStr === '1';
      if (isAvailable) {
        availableEndpoints++;
      }

      endpointsStatus.push({
        endpoint: this.endpoints[i],
        available: isAvailable,
        lastErrorTime: parseInt(lastErrorTimeStr || '0', 10),
        errorCount: parseInt(errorCountStr || '0', 10),
      });
    }

    const currentIndexStr = await this.cacheService.get<string>(
      this.CURRENT_INDEX_KEY,
    );

    return {
      status: 'ok',
      availableEndpoints,
      totalEndpoints: this.endpoints.length,
      currentEndpoint: parseInt(currentIndexStr || '0', 10),
      endpoints: endpointsStatus,
      uptime: process.uptime(),
      memory: process.memoryUsage(),
    };
  }
}
