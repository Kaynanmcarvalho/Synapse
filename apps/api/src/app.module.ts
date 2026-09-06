import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ScheduleModule } from '@nestjs/schedule';
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
import { AnalyticsModule } from './modules/analytics/analytics.module';
import { FinanceModule } from './modules/finance/finance.module';
import { PurchasingModule } from './modules/purchasing/purchasing.module';
import { SearchModule } from './modules/search/search.module';
import { PlatformModule } from './modules/platform/platform.module';
import { FieldSalesModule } from './modules/field-sales/field-sales.module';

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
    ScheduleModule.forRoot(),
    HealthModule,
    IamModule,
    WebhooksModule,
    SalesModule,
    FiscalModule,
    AuditModule,
    CatalogModule,
    ComplianceModule,
    InventoryModule,
    AnalyticsModule,
    FinanceModule,
    PurchasingModule,
    SearchModule,
    PlatformModule,
    FieldSalesModule,
  ],
})
export class AppModule {}
