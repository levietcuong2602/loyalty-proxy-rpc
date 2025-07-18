import { IResponse } from '@/shared/interfaces';
import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  Logger,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Response } from 'express';

@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  private readonly logger = new Logger('Exception');
  constructor(private configService: ConfigService) {}
  catch(exception: any, host: ArgumentsHost) {
    const context = host.switchToHttp();

    const res = context.getResponse<Response>();

    let responsePayload: IResponse;
    let status = null;
    if (exception instanceof HttpException) {
      status = exception.getStatus();
      const exceptionRes = exception.getResponse() as {
        statusCode: number;
        message: string | string[];
        error: string;
        code: number;
        status?: any;
      };
      responsePayload = {
        error: false,
        message: exceptionRes.status?.description || exceptionRes.message,
        code: exceptionRes.code || exceptionRes.statusCode,
        data: null,
      };
      this.logger.warn(
        exceptionRes.status?.description || exceptionRes.message,
      );
    } else {
      status = 500;
      responsePayload = {
        error: true,
        message: 'Internal server error',
        code: 500,
        data: null,
      };
      this.logger.error(exception.message, exception.stack);
    }

    res.status(status).json(responsePayload);
  }
}
