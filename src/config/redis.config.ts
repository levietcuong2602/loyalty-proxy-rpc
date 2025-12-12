import { QueueOptions } from 'bull';

const REDIS_PREFIX = 'TAMA:';
const REDIS_QUEUE_PREFIX = 'MESSAGE_QUEUE';
const REDIS_CACHE_PREFIX = 'CACHE:';

export const prefixQueueMs = () => REDIS_PREFIX + REDIS_QUEUE_PREFIX;
export const prefixRedisCache = () => REDIS_PREFIX + REDIS_CACHE_PREFIX;

const redisConfig = (): QueueOptions => ({
  prefix: prefixQueueMs(),
  redis: {
    host: process.env.REDIS_HOST,
    port: parseInt(process.env.REDIS_PORT, 10) || 6379,
    password: process.env.REDIS_PASSWORD,
  },
});
export type IRedisConfig = ReturnType<typeof redisConfig>;

export default redisConfig;
