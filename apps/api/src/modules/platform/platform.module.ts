import { Module } from '@nestjs/common';
import { AnalyticsModule } from '../analytics/analytics.module';
import { CatalogModule } from '../catalog/catalog.module';
import { FinanceModule } from '../finance/finance.module';
import { FiscalModule } from '../fiscal/fiscal.module';
import { IamModule } from '../iam/iam.module';
import { IntegrationsController } from './controllers/integrations.controller';
import { PlatformOnboardingController } from './controllers/onboarding.controller';
import { PlatformRepository } from './repositories/platform.repository';
import { IntegrationsService } from './services/integrations.service';
import { PlatformOnboardingService } from './services/onboarding.service';

@Module({
  imports: [FiscalModule, FinanceModule, IamModule, AnalyticsModule, CatalogModule],
  controllers: [IntegrationsController, PlatformOnboardingController],
  providers: [PlatformRepository, IntegrationsService, PlatformOnboardingService],
  exports: [IntegrationsService, PlatformOnboardingService],
})
export class PlatformModule {}
