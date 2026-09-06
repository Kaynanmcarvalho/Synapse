import { BadRequestException, ForbiddenException } from '@nestjs/common';
import type { FiscalCompanyConfig, Page, Product } from '@synapse/types';
import type { StockIntelligenceService } from '../../analytics/services/stock-intelligence.service';
import type { ProductService } from '../../catalog/services/product.service';
import type { FiscalConfigService } from '../../fiscal/services/fiscal-config.service';
import type { MembershipRecord, TenantContext } from '../../iam/iam.types';
import type { MembershipRepository } from '../../iam/repositories/membership.repository';
import type { BranchService } from '../../iam/services/branch.service';
import type { PlatformRepository } from '../repositories/platform.repository';
import { PlatformOnboardingService } from './onboarding.service';

const tenant: TenantContext = {
  tenantId: 'tenant-1',
  userId: 'user-1',
  roleIds: [],
  branchIds: [],
  warehouseIds: [],
};

const EMPTY_PLATFORM_STATUS = {
  integrationTests: {},
  integrationHomologationTests: {},
  homologationPassed: false,
  productionActivatedAt: null,
  productionActivatedBy: null,
};

function buildService(overrides: {
  branchCount?: number;
  fiscalConfig?: FiscalCompanyConfig;
  hasStock?: boolean;
  productCount?: number;
  memberCount?: number;
  homologationPassed?: boolean;
  productionActivatedAt?: string | null;
}) {
  const branches = { list: jest.fn(() => Array(overrides.branchCount ?? 0).fill({})) };
  const fiscalConfig = { get: jest.fn(() => overrides.fiscalConfig) };
  const stockIntelligence = {
    hasAnyStock: jest.fn(() => Promise.resolve(overrides.hasStock ?? false)),
  };
  const products = {
    search: jest.fn(
      () =>
        ({
          items: Array(overrides.productCount ?? 0).fill({}),
          nextCursor: null,
          hasMore: false,
        }) as Page<Product>,
    ),
  };
  const memberships = {
    listByTenant: jest.fn(() =>
      Promise.resolve(Array(overrides.memberCount ?? 1).fill({}) as MembershipRecord[]),
    ),
  };
  const activateProduction = jest.fn(() => Promise.resolve());
  const repository = {
    getStatus: jest.fn(() =>
      Promise.resolve({
        ...EMPTY_PLATFORM_STATUS,
        homologationPassed: overrides.homologationPassed ?? false,
        productionActivatedAt: overrides.productionActivatedAt ?? null,
      }),
    ),
    activateProduction,
  };

  const service = new PlatformOnboardingService(
    branches as unknown as BranchService,
    fiscalConfig as unknown as FiscalConfigService,
    stockIntelligence as unknown as StockIntelligenceService,
    products as unknown as ProductService,
    memberships as unknown as MembershipRepository,
    repository as unknown as PlatformRepository,
  );
  return { service, repository, activateProduction };
}

const fiscalConfigFixture = (overrides: Partial<FiscalCompanyConfig> = {}): FiscalCompanyConfig =>
  ({
    companyId: 'tenant-1',
    environment: 'HOMOLOGACAO',
    provider: 'MOCK',
    certificateSecretRef: 'fiscal/tenant-1/a1',
    ...overrides,
  }) as FiscalCompanyConfig;

describe('PlatformOnboardingService.getStatus', () => {
  it('marca tudo pendente para um tenant recém-criado', async () => {
    const { service } = buildService({ memberCount: 1 });
    const status = await service.getStatus(tenant);

    const byId = new Map(status.steps.map((step) => [step.id, step]));
    expect(byId.get('DADOS_EMPRESA')?.completed).toBe(true); // sempre true: tenant existe
    expect(byId.get('FILIAIS')?.completed).toBe(false);
    expect(byId.get('CERTIFICADO_FISCAL')?.completed).toBe(false);
    expect(byId.get('CONFIG_FISCAL')?.completed).toBe(false);
    expect(byId.get('BANCO')?.completed).toBe(false);
    expect(byId.get('USUARIOS')?.completed).toBe(false); // só 1 membro (o fundador)
    expect(status.readyForProduction).toBe(false);
  });

  it('completa as oito etapas que têm dado real quando tudo está configurado', async () => {
    const { service } = buildService({
      branchCount: 1,
      fiscalConfig: fiscalConfigFixture(),
      hasStock: true,
      productCount: 5,
      memberCount: 2,
      homologationPassed: true,
    });
    const status = await service.getStatus(tenant);
    const byId = new Map(status.steps.map((step) => [step.id, step]));
    for (const id of [
      'DADOS_EMPRESA',
      'FILIAIS',
      'CERTIFICADO_FISCAL',
      'CONFIG_FISCAL',
      'ESTOQUE',
      'PRODUTOS',
      'USUARIOS',
      'TESTE_HOMOLOGACAO',
    ] as const) {
      expect(byId.get(id)?.completed).toBe(true);
    }
    // PRODUCAO em si não é obrigatória e ainda não foi ativada
    expect(byId.get('PRODUCAO')?.completed).toBe(false);
  });

  it('não conta "BANCO" como completo mesmo com o resto pronto (nenhuma conta persistida ainda)', async () => {
    const { service } = buildService({
      branchCount: 1,
      fiscalConfig: fiscalConfigFixture(),
      hasStock: true,
      productCount: 1,
      memberCount: 2,
      homologationPassed: true,
    });
    const status = await service.getStatus(tenant);
    expect(status.steps.find((step) => step.id === 'BANCO')?.completed).toBe(false);
    expect(status.readyForProduction).toBe(false);
  });
});

describe('PlatformOnboardingService.activateProduction', () => {
  const readyOverrides = {
    branchCount: 1,
    fiscalConfig: fiscalConfigFixture(),
    hasStock: true,
    productCount: 1,
    memberCount: 2,
    homologationPassed: true,
  };

  it('recusa sem a confirmação exata', async () => {
    const { service } = buildService(readyOverrides);
    await expect(service.activateProduction(tenant, 'ativar producao')).rejects.toBeInstanceOf(
      BadRequestException,
    );
  });

  it('recusa quando falta a etapa obrigatória BANCO', async () => {
    const { service } = buildService(readyOverrides);
    await expect(service.activateProduction(tenant, 'ATIVAR PRODUCAO')).rejects.toThrow(
      /BANCO|Conta bancária/i,
    );
  });

  it('recusa ativar de novo quando produção já foi ativada', async () => {
    const { service } = buildService({
      ...readyOverrides,
      productionActivatedAt: '2026-01-01T00:00:00.000Z',
    });
    await expect(service.activateProduction(tenant, 'ATIVAR PRODUCAO')).rejects.toBeInstanceOf(
      ForbiddenException,
    );
  });
});
