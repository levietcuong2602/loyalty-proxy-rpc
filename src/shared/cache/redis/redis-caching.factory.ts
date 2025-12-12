import {
  CacheModuleOptions,
  CacheOptionsFactory,
  CacheStore,
} from '@nestjs/cache-manager';
import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { RedisOptions } from 'ioredis';
import { redisStore } from 'cache-manager-redis-store';

import { prefixRedisCache } from '@config/redis.config';
import { TTL_1H } from '../shared/caching.constant';

@Injectable()
export class RedisCachingFactory implements CacheOptionsFactory {
  constructor(private configService: ConfigService) {}

  async createCacheOptions(): Promise<CacheModuleOptions> {
    const { host, port, password } = this.configService.get(
      'redis.redis',
    ) as RedisOptions;

    return {
      prefix: prefixRedisCache(),
      ttl: TTL_1H,
      store: (await redisStore({
        socket: {
          host,
          port,
          password,
        },
        password,
      })) as unknown as CacheStore,
    };
  }
}
