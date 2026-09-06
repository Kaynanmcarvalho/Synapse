import { Module } from '@nestjs/common';
import { FiscalConfigController } from './controllers/fiscal-config.controller';
import { NfeController } from './controllers/nfe.controller';
import { MockFiscalProvider } from './providers/mock-fiscal.provider';
import { FiscalRepository } from './repositories/fiscal.repository';
import { FiscalConfigService } from './services/fiscal-config.service';
import { FiscalProviderRegistry } from './services/fiscal-provider.registry';
import { NfeService } from './services/nfe.service';
import { SecretVaultService } from './services/secret-vault.service';
import { NfceController } from './controllers/nfce.controller';
import { NfceService } from './services/nfce.service';
import { MdfeController } from './controllers/mdfe.controller';
import { MdfeRepository } from './repositories/mdfe.repository';
import { MdfeService } from './services/mdfe.service';

@Module({
  controllers: [FiscalConfigController, NfeController, NfceController, MdfeController],
  providers: [
    FiscalRepository,
    MockFiscalProvider,
    FiscalProviderRegistry,
    SecretVaultService,
    FiscalConfigService,
    NfeService,
    NfceService,
    MdfeRepository,
    MdfeService,
  ],
  exports: [FiscalRepository, FiscalProviderRegistry, NfeService, NfceService],
})
export class FiscalModule {}
