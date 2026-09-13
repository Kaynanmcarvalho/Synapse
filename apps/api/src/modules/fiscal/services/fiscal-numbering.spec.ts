import type { FiscalCompanyConfig } from '@synapse/types';
import { MockFiscalProvider } from '../providers/mock-fiscal.provider';
import { FiscalRepository } from '../repositories/fiscal.repository';
import type { FiscalProviderRegistry } from './fiscal-provider.registry';
import { NfeService } from './nfe.service';

const config: FiscalCompanyConfig = {
  companyId: 'company',
  environment: 'HOMOLOGACAO',
  provider: 'MOCK',
  crt: 3,
  stateRegistration: '123',
  cscId: null,
  cscSecretRef: null,
  nfeSeries: 1,
  nfceSeries: 1,
  state: 'GO',
  taxRegime: 'Regime Normal',
  certificateSecretRef: null,
  certificatePasswordSecretRef: null,
  providerApiKeySecretRef: null,
  providerTenantIdSecretRef: null,
  nfe: {
    cfopInState: '5102',
    cfopOutOfState: '6102',
    operationNature: 'VENDA',
    nextNumber: 3159,
    danfeOrientation: 'PORTRAIT',
    additionalInfo: '',
    emissionMode: 'NORMAL',
  },
};

describe('numeração vinda do assistente', () => {
  it('a primeira NF-e continua do próximo número configurado', async () => {
    const repository = new FiscalRepository();
    repository.saveConfig(config);
    const provider = new MockFiscalProvider();
    const service = new NfeService(repository, {
      resolve: () => provider,
    } as unknown as FiscalProviderRegistry);
    const issue = (key: string) =>
      service.issue('tenant', {
        companyId: 'company',
        referenceId: key,
        idempotencyKey: `issue-${key}`,
        payload: { naturezaOperacao: 'VENDA' },
      });
    expect((await issue('sale-1')).number).toBe(3159);
    expect((await issue('sale-2')).number).toBe(3160);
  });
});
