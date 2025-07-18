import { Injectable } from '@nestjs/common';
import { APPLICATION_QUEUE } from '../../../../constants/queue';
import { InjectQueue } from '@nestjs/bull';
import { Queue } from 'bull';
import {
  IWriteLogFilePayload,
  LogType,
} from '../interfaces/sync-log-file.interface';
import { GCP_SYNC_LOG_MS_PROCESS } from '../enums/queue.enum';

@Injectable()
export class SyncLogFileGcpProducer {
  private readonly delayTime = 5000; // delay before execute a job (in milliseconds)
  private readonly attemptsNumber = 5; // retry number

  constructor(
    @InjectQueue(APPLICATION_QUEUE.SYNC_LOG_FILE_QUEUE)
    private syncLogFileGCPQueue: Queue<IWriteLogFilePayload | LogType | any>,
  ) {}

  /**
   * Writing log to local file
   * @param data
   */
  async writeLogToFile(data: IWriteLogFilePayload) {
    this.syncLogFileGCPQueue.add(
      GCP_SYNC_LOG_MS_PROCESS.WRITE_LOG_TO_FILE,
      data,
      {
        delay: this.delayTime,
        attempts: this.attemptsNumber,
        removeOnComplete: true,
      },
    );
  }

  /**
   * Removing old log files
   */
  async removeOldLogFiles() {
    this.syncLogFileGCPQueue.add(
      GCP_SYNC_LOG_MS_PROCESS.REMOVE_OLD_LOG_FILE,
      {},
      {
        delay: this.delayTime,
        attempts: this.attemptsNumber,
      },
    );
  }
}
