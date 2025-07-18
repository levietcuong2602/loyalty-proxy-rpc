export * from './redis';
export * from './jwt';

export const PRODUCTION_ENV = 'production';
export const DEVELOPMENT_ENV = 'development';

export const DEFAULT_ITEMS_PER_PAGE = 100;

export const PREFIX_SUBSCRIPTION_CODE = 'GENAI';
export const CODE_LENGTH = 10;

export const MAX_QUERY_PER_GUEST = 3;

export const ENGLISH_AI_SERVICE = '67f144857070622c7ab0b182';

export const MAX_MESSAGE_HISTORY = 100;

export const CREDITS_PER_REQUEST = 5;

export const FREE_DAILY_PACKAGE_CODE = 'ELA1';

export enum VinaphoneReasonCode {
  SUCCESS = 0,
  FAIL = 1,
  SYNTAX_ERROR = 2,
  CONTENTPACK_ERROR = 3,
  SYSTEM_ERROR = 4,
  CONTENTPACK_NOT_MATCH = 5,
}
