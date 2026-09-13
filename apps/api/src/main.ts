import 'reflect-metadata';
import { Logger } from '@nestjs/common';
import { FirebaseConfigError, FirebaseCredentialFileError } from '@synapse/firebase/admin';
import { ConfigService } from '@nestjs/config';
import { NestFactory } from '@nestjs/core';
import { type NestExpressApplication } from '@nestjs/platform-express';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import compression from 'compression';
import helmet from 'helmet';
import { mkdirSync } from 'node:fs';
import { AppModule } from './app.module';
import { type AppConfig, APP_CONFIG_KEY } from './config/app.config';
import { HttpExceptionFilter } from './common/filters/http-exception.filter';
import { LoggingInterceptor } from './common/interceptors/logging.interceptor';
import { requestContext } from './common/observability/request-context';
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
    // Sem isto o Nest encerra o processo dentro do create, e o erro de
    // credencial some num stack trace de injecao de dependencia. Com o erro na
    // mao, quem sobe a API le o que falta e como resolver.
    abortOnError: false,
  });

  const config = app.get(ConfigService).getOrThrow<AppConfig>(APP_CONFIG_KEY);

  app.use(requestContext);
  app.use(
    helmet({
      contentSecurityPolicy: {
        directives: {
          defaultSrc: ["'self'"],
          scriptSrc: ["'self'", "'unsafe-inline'"],
          styleSrc: ["'self'", "'unsafe-inline'"],
          imgSrc: ["'self'", 'data:', 'https:'],
        },
      },
    }),
  );
  app.use(compression());
  app.enableCors({ origin: [...config.corsOrigins], credentials: true });
  app.setGlobalPrefix(`${config.prefix}/${config.version}`);
  app.useGlobalFilters(new HttpExceptionFilter());
  app.useGlobalInterceptors(new LoggingInterceptor());
  app.enableShutdownHooks();

  const openApi = SwaggerModule.createDocument(
    app,
    new DocumentBuilder()
      .setTitle('Synapse API')
      .setDescription('API multi-tenant do ERP Synapse. Todas as rotas de negócio usam /api/v1.')
      .setVersion('1.0')
      .addBearerAuth()
      .addApiKey({ type: 'apiKey', in: 'header', name: 'X-Device-Session' }, 'device-session')
      .build(),
  );
  SwaggerModule.setup(`${config.prefix}/${config.version}/docs`, app, openApi, {
    jsonDocumentUrl: `${config.prefix}/${config.version}/openapi.json`,
  });

  // Fotos de produto (c8-2). So para dev: producao serve pelo Firebase Storage.
  mkdirSync(UPLOADS_DIR, { recursive: true });
  app.useStaticAssets(UPLOADS_DIR, { prefix: '/uploads' });

  await app.listen(config.port);

  Logger.log(
    `Synapse API em http://localhost:${config.port}/${config.prefix}/${config.version}`,
    'Bootstrap',
  );
}

/** Sem credencial do Firebase a API nao tem banco, e morrer com um stack trace
 *  de injecao de dependencia esconde a unica coisa que importa: qual arquivo
 *  falta e como resolver. Quem le isso esta com a tela de login na frente
 *  dizendo "verifique se a API esta no ar". */
const ERRO_DE_CREDENCIAL = new Set([FirebaseConfigError.name, FirebaseCredentialFileError.name]);

void bootstrap().catch((erro: unknown) => {
  const falha = erro as { name?: string; message?: string };
  if (ERRO_DE_CREDENCIAL.has(falha?.name ?? '')) {
    process.stderr.write(
      `\nSynapse API: não subiu — ${falha.message}\n\n` +
        'Duas saídas:\n' +
        '  1) Desenvolvimento no emulador, sem segredo:  pnpm dev:emulador\n' +
        '  2) Projeto real: gere a chave no Console do Firebase (Configurações do\n' +
        '     projeto > Contas de serviço > Gerar nova chave privada) e salve no\n' +
        '     caminho de GOOGLE_APPLICATION_CREDENTIALS, fora do repositório.\n\n' +
        'Detalhes no README, em "Projeto Firebase real".\n\n',
    );
  } else {
    Logger.error(erro instanceof Error ? (erro.stack ?? erro.message) : String(erro), 'Bootstrap');
  }
  process.exit(1);
});
