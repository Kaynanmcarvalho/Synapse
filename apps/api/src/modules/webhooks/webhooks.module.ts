import { Module } from '@nestjs/common';
import { FinanceModule } from '../finance/finance.module';
import { BoletoWebhookProcessor } from './boleto-webhook.processor';
import { WebhookInbox } from './webhook-inbox';
import { FilaDeWebhooks, FilaEmMemoria } from './webhook-queue';
import { WebhooksController } from './webhooks.controller';
import { WebhooksService } from './webhooks.service';
import { SegredosDeWebhook } from './webhook-signature';

@Module({
  imports: [FinanceModule],
  controllers: [WebhooksController],
  providers: [
    BoletoWebhookProcessor,
    WebhookInbox,
    SegredosDeWebhook,
    WebhooksService,
    {
      provide: FilaDeWebhooks,
      // useClass faz o Nest tentar resolver os parâmetros opcionais
      // (política de retentativa, função de dormir) como dependências —
      // eles não são providers, só defaults pra teste instanciar direto.
      useFactory: (inbox: WebhookInbox) => new FilaEmMemoria(inbox),
      inject: [WebhookInbox],
    },
  ],
  exports: [WebhookInbox, WebhooksService],
})
export class WebhooksModule {}
