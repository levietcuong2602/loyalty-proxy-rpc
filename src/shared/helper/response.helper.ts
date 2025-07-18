import { IResponse } from '../interfaces';

export const successResponse = (
  data: any,
  message: string = 'Success',
): IResponse => {
  return {
    error: false,
    data,
    message,
    code: 200,
  };
};

export const errorResponse = (
  message: string,
  code: number = 500,
): IResponse => {
  return {
    error: true,
    message,
    code,
    data: null,
  };
};
