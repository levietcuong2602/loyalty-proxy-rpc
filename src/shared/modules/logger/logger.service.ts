import { ConsoleLogger, Injectable } from '@nestjs/common';
import { SyncLogFileGcpProducer } from '../sync-log/producers/sync-log-file.producer';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class LoggerService extends ConsoleLogger {
  private readonly enabledLog = true;
  constructor(
    private readonly syncLogGpcProducer: SyncLogFileGcpProducer,
    private readonly configService: ConfigService,
  ) {
    super();
    this.enabledLog = configService.get('enabledLog');
  }

  log(message: unknown, context?: unknown, ...rest: unknown[]) {
    if (this.enabledLog) {
      this.syncLogGpcProducer.writeLogToFile({
        context: context as string,
        level: 'LOG',
        message: message as string,
        rest,
      });
    }

    super.log(message, context, ...rest);
  }

  error(message: any, stack?: string, context?: string) {
    if (this.enabledLog) {
      this.syncLogGpcProducer.writeLogToFile({
        context: context as string,
        level: 'LOG',
        message: stack,
        rest: [],
      });
    }

    super.error(message, stack, context);
  }
}
