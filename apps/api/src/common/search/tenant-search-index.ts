import { PrefixIndex } from './prefix-index';

/** Atualizado na escrita, nunca reconstruído durante uma pesquisa. */
export class TenantSearchIndex<T extends { id: string; tenantId: string }> {
  private readonly tenants = new Map<string, { index: PrefixIndex; values: Map<string, T> }>();
  put(value: T, text: string): void {
    let tenant = this.tenants.get(value.tenantId);
    if (!tenant) {
      tenant = { index: new PrefixIndex(), values: new Map() };
      this.tenants.set(value.tenantId, tenant);
    }
    tenant.index.add({ id: value.id, text });
    tenant.values.set(value.id, value);
  }
  remove(tenantId: string, id: string): void {
    const tenant = this.tenants.get(tenantId);
    tenant?.index.remove(id);
    tenant?.values.delete(id);
  }
  search(tenantId: string, query: string, limit: number): T[] {
    const tenant = this.tenants.get(tenantId);
    if (!tenant) return [];
    return tenant.index.search(query, limit).flatMap((id) => {
      const value = tenant.values.get(id);
      return value ? [value] : [];
    });
  }
}
