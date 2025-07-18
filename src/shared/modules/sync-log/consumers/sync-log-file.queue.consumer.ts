/* eslint-disable @typescript-eslint/no-unused-vars */
import { Process, Processor } from '@nestjs/bull';
import { Job } from 'bull';
import * as fs from 'fs';
import * as moment from 'moment';
import * as os from 'os';
import * as path from 'path';
import { dirname } from 'path';
import * as stream from 'stream';
import * as util from 'util';

import { IWriteLogFilePayload } from '../interfaces/sync-log-file.interface';
import { APPLICATION_QUEUE } from '../../../../constants/queue';
import { GCP_SYNC_LOG_MS_PROCESS } from '../enums/queue.enum';

const hostname = os.hostname();
const finished = util.promisify(stream.finished);

@Processor(APPLICATION_QUEUE.SYNC_LOG_FILE_QUEUE)
export class SyncFileLogGCPConsumer {
  private readonly logFolderName = 'logs';

  private readonly rootDir = path.join(
    dirname(require.main.path),
    this.logFolderName,
  );

  private readonly datePattern = 'YYYY-MM-DD';
  private dateTimePattern = 'YYYY-MM-DD hh:mm:ss';
  constructor() {
    this.checkFolderIsExistent();
  }

  /**
   * for each log written out will be written to file
   * @param job
   */
  @Process(GCP_SYNC_LOG_MS_PROCESS.WRITE_LOG_TO_FILE)
  async writeLogFileProcessor(job: Job<IWriteLogFilePayload>) {
    this.checkFolderIsExistent();
    await this.writeLogToFile(job.data);
  }

  /**
   * Removing old log files
   * @param _
   */
  @Process(GCP_SYNC_LOG_MS_PROCESS.REMOVE_OLD_LOG_FILE)
  removeOldLogFile(_: Job) {
    const dirPaths = fs.readdirSync(this.rootDir);
    const dateNow = moment().format(this.datePattern);

    for (const dirPath of dirPaths) {
      if (!dirPath.includes(dateNow)) {
        fs.rmSync(path.join(this.rootDir, dirPath), {
          force: true,
          recursive: true,
        });
      }
    }
  }

  /**
   * for each log written out will be written to file
   * @param data
   */
  private async writeLogToFile(data: IWriteLogFilePayload) {
    let logType = 'app';
    if (data.context === 'HTTP') {
      logType = 'api';
    }

    const isExisted = fs.existsSync(this.getLogFilePath(logType));
    if (isExisted) {
      fs.appendFileSync(this.getLogFilePath(logType), this.formatLog(data));
    } else {
      const writeStream = fs.createWriteStream(this.getLogFilePath(logType));
      writeStream.write(this.formatLog(data));
      writeStream.end();
      await finished(writeStream);
    }
  }

  /**
   * get log file path
   * @param logType
   * @returns path of log file
   */
  private getLogFilePath(logType: string) {
    return path.join(this.logFolderName, this.getLogFileName(logType));
  }

  /**
   *
   * @param logType
   * @returns name of log file
   */
  private getLogFileName(logType: string) {
    const dateNowFormatted = moment().format(this.datePattern);
    return `${dateNowFormatted}/${hostname}_${logType}.log`;
  }

  /**
   * checking the existent folder
   */
  private checkFolderIsExistent() {
    const formattedDate = moment().format(this.datePattern);
    const dir = path.join(this.rootDir, formattedDate);

    if (!fs.existsSync(this.rootDir)) {
      fs.mkdirSync(this.rootDir);
    }

    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir);
    }
  }

  /**
   * formatting log file before write log to file
   * @param data
   * @returns
   */
  private formatLog(data: IWriteLogFilePayload) {
    const formattedDate = moment().format(this.dateTimePattern);
    return `[OPS PORTAL API] - ${formattedDate} - ${data.level} [${data.context}] ${data.message} \n`;
  }
}
