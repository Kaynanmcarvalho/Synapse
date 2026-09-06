import { Module } from '@nestjs/common';
import { FiscalConfigController } from './controllers/fiscal-config.controller';
import { NfeController } from './controllers/nfe.controller';
import { MockFiscalProvider } from './providers/mock-fiscal.provider';
import { FiscalRepository } from './repositories/fiscal.repository';
import { FiscalConfigService } from './services/fiscal-config.service';
import { FiscalProviderRegistry } from './services/fiscal-provider.registry';
import { NfeService } from './services/nfe.service';
import { SecretVaultService } from './services/secret-vault.service';

@Module({
  controllers: [FiscalConfigController, NfeController],
  providers: [
    FiscalRepository,
    MockFiscalProvider,
    FiscalProviderRegistry,
    SecretVaultService,
    FiscalConfigService,
    NfeService,
  ],
  exports: [FiscalRepository, FiscalProviderRegistry, NfeService],
})
export class FiscalModule {}
