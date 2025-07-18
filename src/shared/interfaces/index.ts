export interface IResponse {
  error: boolean;
  message: string | string[];
  code: number;
  data?: any;
}
