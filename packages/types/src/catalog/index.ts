import type { AuditStamp, ProductId, TenantId } from '../common';

export type ProductStatus = 'active' | 'inactive' | 'archived';

export interface Product extends AuditStamp {
  readonly id: ProductId;
  readonly tenantId: TenantId;
  readonly sku: string;
  readonly name: string;
  readonly unit: string;
  readonly status: ProductStatus;
}
