import 'reflect-metadata';
import { Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { NestFactory } from '@nestjs/core';
import { type NestExpressApplication } from '@nestjs/platform-express';
import compression from 'compression';
import helmet from 'helmet';
import { mkdirSync } from 'node:fs';
import { AppModule } from './app.module';
import { type AppConfig, APP_CONFIG_KEY } from './config/app.config';
import { HttpExceptionFilter } from './common/filters/http-exception.filter';
import { LoggingInterceptor } from './common/interceptors/logging.interceptor';
import { UPLOADS_DIR } from './modules/catalog/services/photo-storage.service';

/** Nao registramos a ValidationPipe do Nest de proposito: a validacao do projeto
 *  e Zod (packages/validation), aplicada por rota com o ZodValidationPipe. A pipe
 *  padrao exigiria class-validator e criaria uma segunda pilha de validacao. */
async function bootstrap(): Promise<void> {
  // rawBody: a assinatura de webhook e calculada sobre os bytes que o provedor
  // enviou. Re-serializar o JSON ja parseado muda espaco e ordem de chave e a
  // conferencia passa a falhar sempre — ver modules/webhooks.
  const app = await NestFactory.create<NestExpressApplication>(AppModule, {
    bufferLogs: true,
    rawBody: true,
  });

  const config = app.get(ConfigService).getOrThrow<AppConfig>(APP_CONFIG_KEY);

  app.use(helmet());
  app.use(compression());
  app.enableCors({ origin: [...config.corsOrigins], credentials: true });
  app.setGlobalPrefix(`${config.prefix}/${config.version}`);
  app.useGlobalFilters(new HttpExceptionFilter());
  app.useGlobalInterceptors(new LoggingInterceptor());
  app.enableShutdownHooks();

  // Fotos de produto (c8-2). So para dev: producao serve pelo Firebase Storage.
  mkdirSync(UPLOADS_DIR, { recursive: true });
  app.useStaticAssets(UPLOADS_DIR, { prefix: '/uploads' });

  await app.listen(config.port);

  Logger.log(
    `Synapse API em http://localhost:${config.port}/${config.prefix}/${config.version}`,
    'Bootstrap',
  );
}

void bootstrap();
