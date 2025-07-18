import { MiddlewareConsumer, Module, RequestMethod } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { RpcModule } from './modules/rpc/rpc.module';
import { ConfigModule } from '@nestjs/config';
import configuration from './config';
import { RawBodyMiddleware } from './middlewares/raw-body.middleware';
import { LoggerMiddleware } from './middlewares/logger.middleware';
import { SyncLogModule } from './shared/modules/sync-log/sync-log.module';
import { LoggerModule } from './shared/modules/logger/logger.module';
import { ScheduleModule } from '@nestjs/schedule';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      load: [configuration],
    }),
    RpcModule,
    LoggerModule,
    SyncLogModule,
    ScheduleModule.forRoot(),
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {
  configure(consumer: MiddlewareConsumer) {
    consumer.apply(RawBodyMiddleware).forRoutes({
      path: '*',
      method: RequestMethod.ALL,
    });
    consumer.apply(LoggerMiddleware).forRoutes('*');
  }
}
