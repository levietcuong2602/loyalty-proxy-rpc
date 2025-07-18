export type LogType = 'app' | 'api';

export interface IWriteLogFilePayload {
  level: 'ERROR' | 'LOG';
  message: string;
  context?: string;
  rest: unknown[];
}

export interface ISyncLogFileGcpPayload {
  logType: LogType;
}
