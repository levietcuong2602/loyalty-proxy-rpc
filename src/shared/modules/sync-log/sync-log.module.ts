import { Module } from '@nestjs/common';
import { SyncLogFileGcpProducer } from './producers/sync-log-file.producer';
import { BullModule } from '@nestjs/bull';
import { APPLICATION_QUEUE } from '../../../constants/queue';
import { SyncFileLogGCPConsumer } from './consumers/sync-log-file.queue.consumer';

@Module({
  imports: [
    BullModule.registerQueue({
      name: APPLICATION_QUEUE.SYNC_LOG_FILE_QUEUE,
    }),
  ],
  providers: [SyncLogFileGcpProducer, SyncFileLogGCPConsumer],
  exports: [SyncLogFileGcpProducer],
})
export class SyncLogModule {}
