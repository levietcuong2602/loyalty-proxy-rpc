import { Inject, Injectable } from '@nestjs/common';

import { CachingService } from '../shared/caching-service.interface';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { Cache } from 'cache-manager';
import Redis, { RedisOptions } from 'ioredis';
import { ConfigService } from '@nestjs/config';

/**
 * Caching service using Redis.
 * - Import [`RedisCacheStrategyModule`] before using.
 * - Use with `@Inject(CACHE_SERVICE)`
 */
@Injectable()
export class RedisCachingService extends CachingService {
  private readonly clientRedis: Redis;
  constructor(
    @Inject(CACHE_MANAGER) public readonly cacheManager: Cache,
    private readonly configService: ConfigService,
  ) {
    super(cacheManager);
    const { host, port, password } = this.configService.get(
      'redis.redis',
    ) as RedisOptions;

    this.clientRedis = new Redis({
      host, // or custom host
      port, // default port for Redis
      password, // or custom password
    });
  }

  /**
   * Retrieve the cached value via cache-key.
   * @param identity a caching key for redis to store the value.
   * @param transformer Transform the data from `string` | `number` | `Buffer` to specific kind of type value.
   */
  async get<T = string>(
    identity: string,
    transformer?: (val: string | null) => T,
  ): Promise<T> {
    const val = await super.get<string>(identity);
    if (transformer) {
      return transformer(val);
    }
    return val as unknown as T;
  }

  /**
   * Set the value to Redis.
   * @param identity A caching key for redis to store the value.
   * @param value The original value. Prefer `string` | `number` | `Buffer`.
   * @param opts Caching option.
   * @param opts.transformer Transform the raw data to suitable type for Redis to store (`string` | `number` | `Buffer`).
   * If the original value is not in suitable type, and this function is not provided, it will throw error in runtime.
   * @param opts.ttl Time to cache the data (in second). Default `undefined`, which is not to be expired.
   */
  async set<T>(
    identity: string,
    value: T,
    opts?: {
      transformer?: (val: T) => string | number | Buffer;
      // in seconds
      ttl?: number;
    },
  ): Promise<boolean> {
    const { transformer, ttl } = opts ?? {};
    let val = value as string | number | Buffer;
    if (transformer) {
      val = transformer(value);
    }
    return super.set(identity, val, { ttl });
  }

  async zadd(identity: string, score: number, member: string) {
    return this.clientRedis.zadd(identity, score, member);
  }

  async incr(identity: string) {
    return this.clientRedis.incr(identity);
  }

  async ping() {
    return this.clientRedis.ping();
  }
}
