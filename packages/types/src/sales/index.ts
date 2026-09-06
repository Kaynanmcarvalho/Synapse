import type { AuditStamp, BranchId, CustomerId, OrderId, TenantId } from '../common';

export type OrderStatus = 'draft' | 'quote' | 'confirmed' | 'invoiced' | 'delivered' | 'cancelled';

export interface Order extends AuditStamp {
  readonly id: OrderId;
  readonly tenantId: TenantId;
  readonly branchId: BranchId;
  readonly customerId: CustomerId;
  readonly status: OrderStatus;
  readonly total: number;
}
