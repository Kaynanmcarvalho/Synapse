import { Injectable, NotFoundException } from '@nestjs/common';
import type { FiscalCompanyConfig, FiscalProvider } from '@synapse/types';
import { MockFiscalProvider } from '../providers/mock-fiscal.provider';
import { GynFiscalProvider } from '../providers/gyn-fiscal.provider';
import { SecretVaultService } from './secret-vault.service';

@Injectable()
export class FiscalProviderRegistry {
  constructor(
    private readonly mock: MockFiscalProvider,
    private readonly vault: SecretVaultService,
  ) {}
  resolve(config: FiscalCompanyConfig): FiscalProvider {
    if (config.provider === 'MOCK') return this.mock;
    if (!config.providerApiKeySecretRef || !config.providerTenantIdSecretRef) {
      throw new NotFoundException('Credenciais Gyn Fiscal não cadastradas para esta empresa');
    }
    return new GynFiscalProvider(
      this.vault.read(config.providerApiKeySecretRef).toString('utf8'),
      this.vault.read(config.providerTenantIdSecretRef).toString('utf8'),
    );
  }
}
