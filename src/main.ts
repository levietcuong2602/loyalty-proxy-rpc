import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ConfigService } from '@nestjs/config';
import { Logger, ValidationPipe, VersioningType } from '@nestjs/common';
import * as compression from 'compression';
import * as cookieParser from 'cookie-parser';
import helmet from 'helmet';
import {
  helmetConfig,
  useDisableHostHeader,
  useEnableCors,
  useSwaggerDoc,
} from './shared/init';
import { useContainer } from 'class-validator';
import { NestExpressApplication } from '@nestjs/platform-express';
import { LoggerService } from './shared/modules/logger/logger.service';
import { join } from 'path';
import * as bodyParser from 'body-parser';

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule);
  const appConfig = app.get(ConfigService);

  process.on('uncaughtException', (error) => {
    Logger.error(`Uncaught Exception: ${error.message}`, error.stack);
  });

  // Xử lý các promise rejection không được bắt
  process.on('unhandledRejection', (reason, promise) => {
    Logger.error(`Unhandled Rejection at: ${promise}, reason: ${reason}`);
  });
  // get logger instance to override nest default logger
  app.useLogger(app.get(LoggerService));

  app.useGlobalPipes(
    new ValidationPipe({
      transform: true,
    }),
  );

  console.log({
    appPrefix: appConfig.get<string>('appPrefix'),
  });

  app.setGlobalPrefix(appConfig.get<string>('appPrefix') || 'api');
  app.enableVersioning({
    type: VersioningType.URI,
    defaultVersion: '1',
    prefix: 'v',
  });
  useSwaggerDoc(app);

  app.use(bodyParser.json({ limit: '50mb' }));
  app.use(bodyParser.urlencoded({ limit: '50mb', extended: true }));
  app.use(cookieParser());
  app.use(compression());
  app.use(helmet(helmetConfig));

  useContainer(app.select(AppModule), { fallbackOnErrors: true });
  useEnableCors(app);
  useDisableHostHeader(app);

  // Cấu hình để phục vụ file tĩnh từ thư mục 'public'
  const publicDir = join(process.cwd(), 'public');
  app.useStaticAssets(publicDir, {
    prefix: '/public/',
  });

  await app.listen(appConfig.get<number>('PORT') || 80);
}
bootstrap();
