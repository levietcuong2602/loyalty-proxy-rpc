import { Injectable } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { SyncLogFileGcpProducer } from '../sync-log/producers/sync-log-file.producer';

@Injectable()
export class LoggerSchedule {
  constructor(private readonly syncLogGpcProducer: SyncLogFileGcpProducer) {}

  /**
   * Every day, old log files will be removed
   */
  @Cron(CronExpression.EVERY_DAY_AT_1AM)
  removeOldLogFilesSchedule() {
    this.syncLogGpcProducer.removeOldLogFiles();
  }
}
