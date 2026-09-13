import { ForbiddenException } from '@nestjs/common';
import type { TenantContext } from '../../iam/iam.types';
import { fiscalConfigSchema } from '../dto/fiscal.schemas';
import type { FiscalConfigService } from '../services/fiscal-config.service';
import { FiscalConfigController } from './fiscal-config.controller';

const input = fiscalConfigSchema.parse({
  environment: 'HOMOLOGACAO',
  provider: 'MOCK',
  crt: 3,
  stateRegistration: '108052079',
  nfeSeries: 1,
  nfceSeries: 1,
  state: 'GO',
  taxRegime: 'Regime Normal',
});

const context = (roleIds: readonly string[] = ['ADMIN_EMPRESA']): TenantContext => ({
  tenantId: 'tenant-session',
  userId: 'user-1',
  roleIds,
  branchIds: [],
  warehouseIds: [],
});

describe('FiscalConfigController', () => {
  const service = {
    get: jest.fn(async (companyId: string) => ({ companyId })),
    save: jest.fn(async (companyId: string) => ({ companyId })),
  };
  const controller = new FiscalConfigController(service as unknown as FiscalConfigService);

  beforeEach(() => jest.clearAllMocks());

  it('sempre salva no tenant derivado da sessão, inclusive para SUPER_ADMIN_SAAS', async () => {
    await controller.save(context(['SUPER_ADMIN_SAAS']), input);
    expect(service.save).toHaveBeenCalledWith('tenant-session', input);
    expect(fiscalConfigSchema.safeParse({ ...input, companyId: 'tenant-forjado' }).success).toBe(
      false,
    );
  });

  it('permite leitura cruzada somente para SUPER_ADMIN_SAAS', async () => {
    await expect(controller.get(context(), 'tenant-alvo')).rejects.toThrow(ForbiddenException);
    await controller.get(context(['SUPER_ADMIN_SAAS']), 'tenant-alvo');
    expect(service.get).toHaveBeenCalledWith('tenant-alvo');
  });
});
