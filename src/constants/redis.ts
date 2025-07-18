export const SCHEDULE_1MIN_LATEST_QUERY = 'tama:schedule_1min:last_query_time';
export const SCHEDULE_5MIN_LATEST_QUERY = 'tama:schedule_5min:last_query_time';

export const OHLCCacheKeyOfToken = (token, type: '1min' | '5min') =>
  `tama:ohlc:${type}:${token}`;
