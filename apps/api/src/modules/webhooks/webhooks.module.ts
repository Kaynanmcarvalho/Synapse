import { Module } from '@nestjs/common';
import { WebhookInbox } from './webhook-inbox';
import { FilaDeWebhooks, FilaEmMemoria } from './webhook-queue';
import { WebhooksController } from './webhooks.controller';
import { WebhooksService } from './webhooks.service';
import { SegredosDeWebhook } from './webhook-signature';

@Module({
  controllers: [WebhooksController],
  providers: [
    WebhookInbox,
    SegredosDeWebhook,
    WebhooksService,
    { provide: FilaDeWebhooks, useClass: FilaEmMemoria },
  ],
  exports: [WebhookInbox, WebhooksService],
})
export class WebhooksModule {}
