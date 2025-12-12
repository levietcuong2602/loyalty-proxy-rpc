import { Module } from '@nestjs/common';
import { RpcService } from './rpc.service';
import { RpcController } from './rpc.controller';
import { RedisCacheStrategyModule } from '@shared/cache/redis/redis-caching.module';

@Module({
  imports: [RedisCacheStrategyModule],
  controllers: [RpcController],
  providers: [RpcService],
})
export class RpcModule {}
