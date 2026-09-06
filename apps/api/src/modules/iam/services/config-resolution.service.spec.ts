import type { ConfigEntry } from '@synapse/types';
import { ConfigRepository } from '../repositories/config.repository';
import { ConfigResolutionService, resolveConfigValue } from './config-resolution.service';
import type { TenantContext } from '../iam.types';

const entry = (value: number, branchId: string | null = null): ConfigEntry<number> => ({
  tenantId: 'tenant-1' as ConfigEntry['tenantId'],
  branchId: branchId as ConfigEntry['branchId'],
  key: 'precos.margemPadrao',
  value,
  updatedAt: new Date().toISOString(),
});

describe('resolveConfigValue — funcao pura da heranca de tres niveis (§4)', () => {
  it('sem branchId, so o valor do tenant conta e a origem e GLOBAL', () => {
    expect(resolveConfigValue('k', null, entry(20), undefined)).toEqual({
      key: 'k',
      value: 20,
      source: 'GLOBAL',
    });
  });

  it('sem branchId e sem valor de tenant, nao ha o que resolver', () => {
    expect(resolveConfigValue('k', null, undefined, undefined)).toBeNull();
  });

  it('com branchId e sem override, herda o valor do tenant como INHERITED', () => {
    expect(resolveConfigValue('k', 'goiania', entry(20), undefined)).toEqual({
      key: 'k',
      value: 20,
      source: 'INHERITED',
    });
  });

  it('com branchId e override, o valor da filial vence como OVERRIDE', () => {
    expect(resolveConfigValue('k', 'goiania', entry(20), entry(18, 'goiania'))).toEqual({
      key: 'k',
      value: 18,
      source: 'OVERRIDE',
    });
  });

  it('com branchId, sem valor de tenant nem override, nao ha o que resolver', () => {
    expect(resolveConfigValue('k', 'goiania', undefined, undefined)).toBeNull();
  });
});

describe('ConfigResolutionService — exemplo do card: empresa 20%, Goiania 18%, Aparecida herda', () => {
  const tenant: TenantContext = {
    tenantId: 'tenant-1',
    userId: 'user-1',
    roleIds: ['ADMIN_EMPRESA'],
    branchIds: [],
    warehouseIds: [],
  };

  it('reproduz o ciclo GLOBAL -> OVERRIDE -> volta a INHERITED', () => {
    const service = new ConfigResolutionService(new ConfigRepository());
    const key = 'precos.margemPadrao';

    service.setGlobal(tenant, key, 20);
    expect(service.resolve(tenant, null, key)).toEqual({ key, value: 20, source: 'GLOBAL' });

    expect(service.resolve(tenant, 'aparecida', key)).toEqual({
      key,
      value: 20,
      source: 'INHERITED',
    });

    service.setOverride(tenant, 'goiania', key, 18);
    expect(service.resolve(tenant, 'goiania', key)).toEqual({
      key,
      value: 18,
      source: 'OVERRIDE',
    });
    expect(service.resolve(tenant, 'aparecida', key)).toEqual({
      key,
      value: 20,
      source: 'INHERITED',
    });

    service.resetToInherited(tenant, 'goiania', key);
    expect(service.resolve(tenant, 'goiania', key)).toEqual({
      key,
      value: 20,
      source: 'INHERITED',
    });
  });

  it('isola a configuracao por tenant', () => {
    const service = new ConfigResolutionService(new ConfigRepository());
    const key = 'estoque.reservaAutomatica';
    service.setGlobal(tenant, key, true);
    const outroTenant: TenantContext = { ...tenant, tenantId: 'tenant-2' };
    expect(service.resolve(outroTenant, null, key)).toBeNull();
  });
});
