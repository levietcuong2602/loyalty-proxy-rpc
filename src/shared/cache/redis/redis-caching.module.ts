import { Module } from '@nestjs/common';
import type { RedisClientOptions } from 'redis';
import { CacheModule } from '@nestjs/cache-manager';

import { CACHE_SERVICE } from '../shared/caching.constant';

import { RedisCachingService } from './redis-caching.service';
import { RedisCachingFactory } from './redis-caching.factory';
import { ConfigModule, ConfigService } from '@nestjs/config';

@Module({
  imports: [
    CacheModule.registerAsync<RedisClientOptions>({
      imports: [ConfigModule],
      useClass: RedisCachingFactory,
      inject: [ConfigService],
    }),
  ],
  providers: [{ provide: CACHE_SERVICE, useClass: RedisCachingService }],
  exports: [CACHE_SERVICE],
})
export class RedisCacheStrategyModule {}
