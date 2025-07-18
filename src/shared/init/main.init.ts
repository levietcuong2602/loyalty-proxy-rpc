import { ConfigService } from '@nestjs/config';
import { NestExpressApplication } from '@nestjs/platform-express';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { NextFunction, Request, Response } from 'express';
import * as basicAuth from 'express-basic-auth';

/**
 * Use dynamic CORS from ENV.
 * @param app
 */
export function useEnableCors(app: NestExpressApplication) {
  app.enableCors({
    origin: '*',
  });
}

/**
 * Construct the Swagger with Basic Authentication on specific environments.
 * @param app
 */
export function useSwaggerDoc(app: NestExpressApplication) {
  const appConfig = app.get(ConfigService);

  const swaggerConfig = appConfig.get<{
    prefix: string;
    account?: string;
    password?: string;
  }>('swagger');

  /** Swagger basic authentication */
  // https://purpleventures.atlassian.net/browse/RH-7802
  if (swaggerConfig.account && swaggerConfig.password) {
    // set basic-authentication with browser-session based. User will be logout
    // once they close the browser.
    app.use(
      `/${swaggerConfig.prefix}`,
      basicAuth({
        challenge: true,
        users: { [swaggerConfig.account]: swaggerConfig.password },
      }),
    );
  }

  const config = new DocumentBuilder()
    .setTitle('XanhGolf APIs')
    .addApiKey()
    .build();
  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup(swaggerConfig.prefix, app, document, {
    swaggerOptions: {
      persistAuthorization: true,
    },
  });
}

/**
 * Disable completely the support of `Host` and `X-Forwarded-Host` in the header
 * to prevent Host Header Injection issue.
 *
 * If you want to utilize the Host header, you will need to write a whitelist for it,
 * or using other specialized custom header.
 * @param app
 */
export function useDisableHostHeader(app: NestExpressApplication) {
  app.use(function (req: Request, res: Response, next: NextFunction) {
    delete req.headers.host;
    delete req.headers['x-forwarded-host'];

    return next();
  });
}
