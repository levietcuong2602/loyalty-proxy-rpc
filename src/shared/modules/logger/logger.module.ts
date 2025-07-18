import { Module } from '@nestjs/common';
import { LoggerService } from './logger.service';
import { LoggerSchedule } from './logger.schedule';
import { SyncLogModule } from '../sync-log/sync-log.module';

@Module({
  imports: [SyncLogModule],
  providers: [LoggerService, LoggerSchedule],
})
export class LoggerModule {}
