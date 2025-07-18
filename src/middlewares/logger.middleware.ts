import { Injectable, Logger, NestMiddleware } from '@nestjs/common';
import { NextFunction, Request, Response } from 'express';
import { defaultTo } from 'lodash';

@Injectable()
export class LoggerMiddleware implements NestMiddleware {
  private logger = new Logger('HTTP');

  constructor() {}

  use(request: Request, response: Response, next: NextFunction): void {
    const { ip, method, originalUrl, body, headers } = request;
    const userAgent = request.get('user-agent') || '';
    response.on('finish', () => {
      // Skip health check log
      if (originalUrl === '/api/v1/health-check') {
        return;
      }

      const { statusCode, statusMessage } = response;

      const messageObject = {
        ip,
        userAgent,
        method,
        path: originalUrl,
        statusCode,
        message: statusMessage,
      };

      if (
        !defaultTo(headers['content-type'], '')
          .toLowerCase()
          .includes('multipart/form-data')
      ) {
        Object.assign(messageObject, { body, headers });
      }

      const message = JSON.stringify(messageObject);
      if (statusCode >= 500) {
        return this.logger.error(message);
      }
      if (statusCode >= 400) {
        return this.logger.warn(message);
      }
      return this.logger.log(message);
    });
    next();
  }
}
