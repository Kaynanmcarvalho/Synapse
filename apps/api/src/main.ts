import 'reflect-metadata';
import { Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { NestFactory } from '@nestjs/core';
import compression from 'compression';
import helmet from 'helmet';
import { AppModule } from './app.module';
import { type AppConfig, APP_CONFIG_KEY } from './config/app.config';
import { HttpExceptionFilter } from './common/filters/http-exception.filter';
import { LoggingInterceptor } from './common/interceptors/logging.interceptor';

/** Nao registramos a ValidationPipe do Nest de proposito: a validacao do projeto
 *  e Zod (packages/validation), aplicada por rota com o ZodValidationPipe. A pipe
 *  padrao exigiria class-validator e criaria uma segunda pilha de validacao. */
async function bootstrap(): Promise<void> {
  const app = await NestFactory.create(AppModule, { bufferLogs: true });

  const config = app.get(ConfigService).getOrThrow<AppConfig>(APP_CONFIG_KEY);

  app.use(helmet());
  app.use(compression());
  app.enableCors({ origin: [...config.corsOrigins], credentials: true });
  app.setGlobalPrefix(`${config.prefix}/${config.version}`);
  app.useGlobalFilters(new HttpExceptionFilter());
  app.useGlobalInterceptors(new LoggingInterceptor());
  app.enableShutdownHooks();

  await app.listen(config.port);

  Logger.log(
    `Synapse API em http://localhost:${config.port}/${config.prefix}/${config.version}`,
    'Bootstrap',
  );
}

void bootstrap();
