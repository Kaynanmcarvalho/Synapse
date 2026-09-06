import { Injectable } from '@nestjs/common';
import type { ConfigEntry, ResolvedConfigValue } from '@synapse/types';
import type { TenantContext } from '../iam.types';
import { ConfigRepository } from '../repositories/config.repository';

/** Funcao pura por tras da heranca (§4): sem branchId, o valor do tenant e a
 *  origem GLOBAL. Com branchId, um override da filial vence; na ausencia dele
 *  o valor herdado do tenant aparece marcado como INHERITED, nunca GLOBAL —
 *  a UI usa essa diferenca para saber se deve mostrar "voltar ao herdado". */
export const resolveConfigValue = <T>(
  key: string,
  branchId: string | null,
  globalEntry: ConfigEntry<T> | undefined,
  branchEntry: ConfigEntry<T> | undefined,
): ResolvedConfigValue<T> | null => {
  if (!branchId) {
    return globalEntry ? { key, value: globalEntry.value, source: 'GLOBAL' } : null;
  }
  if (branchEntry) return { key, value: branchEntry.value, source: 'OVERRIDE' };
  if (globalEntry) return { key, value: globalEntry.value, source: 'INHERITED' };
  return null;
};

@Injectable()
export class ConfigResolutionService {
  constructor(private readonly repository: ConfigRepository) {}

  resolve<T>(
    tenant: TenantContext,
    branchId: string | null,
    key: string,
  ): ResolvedConfigValue<T> | null {
    const globalEntry = this.repository.get(tenant.tenantId, null, key) as
      ConfigEntry<T> | undefined;
    const branchEntry = branchId
      ? (this.repository.get(tenant.tenantId, branchId, key) as ConfigEntry<T> | undefined)
      : undefined;
    return resolveConfigValue(key, branchId, globalEntry, branchEntry);
  }

  setGlobal<T>(tenant: TenantContext, key: string, value: T): ResolvedConfigValue<T> {
    this.repository.set({
      tenantId: tenant.tenantId as ConfigEntry['tenantId'],
      branchId: null,
      key,
      value,
      updatedAt: new Date().toISOString(),
    });
    return { key, value, source: 'GLOBAL' };
  }

  setOverride<T>(
    tenant: TenantContext,
    branchId: string,
    key: string,
    value: T,
  ): ResolvedConfigValue<T> {
    this.repository.set({
      tenantId: tenant.tenantId as ConfigEntry['tenantId'],
      branchId: branchId as ConfigEntry['branchId'],
      key,
      value,
      updatedAt: new Date().toISOString(),
    });
    return { key, value, source: 'OVERRIDE' };
  }

  /** Remove o override da filial. O proximo `resolve` volta a devolver o valor
   *  do tenant, marcado INHERITED — e assim que a UI "desfaz" uma sobrescrita. */
  resetToInherited(tenant: TenantContext, branchId: string, key: string): void {
    this.repository.clear(tenant.tenantId, branchId, key);
  }
}
