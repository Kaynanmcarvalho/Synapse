import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { join } from 'node:path';
import { appConfig } from './config/app.config';
import { HealthModule } from './modules/health/health.module';
import { IamModule } from './modules/iam/iam.module';
import { WebhooksModule } from './modules/webhooks/webhooks.module';
import { FiscalModule } from './modules/fiscal/fiscal.module';
import { SalesModule } from './modules/sales/sales.module';
import { AuditModule } from './modules/audit/audit.module';
import { CatalogModule } from './modules/catalog/catalog.module';
import { ComplianceModule } from './modules/compliance/compliance.module';
import { InventoryModule } from './modules/inventory/inventory.module';
import { InboundModule } from './modules/inbound/inbound.module';
import { DeliveryModule } from './modules/delivery/delivery.module';
import { SaasModule } from './modules/saas/saas.module';
import { NotificationModule } from './modules/notifications/notification.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      cache: true,
      load: [appConfig],
      // Relativo ao cwd, ['.env.local'] so acha o arquivo quando o processo sobe
      // de dentro de apps/api. `nest start` via turbo/pnpm --filter roda com esse
      // cwd, mas o .env.local vive na raiz do monorepo — daqui (src ou dist) a
      // raiz esta sempre tres niveis acima, entao resolvemos a partir de __dirname.
      envFilePath: [join(__dirname, '../../../.env.local'), join(__dirname, '../../../.env')],
    }),
    HealthModule,
    IamModule,
    WebhooksModule,
    SalesModule,
    FiscalModule,
    AuditModule,
    CatalogModule,
    ComplianceModule,
    InventoryModule,
    InboundModule,
    DeliveryModule,
    SaasModule,
    NotificationModule,
  ],
})
export class AppModule {}
