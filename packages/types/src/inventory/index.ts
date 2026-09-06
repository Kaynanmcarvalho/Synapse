import type { BranchId, ProductId, TenantId } from '../common';

export type StockMovementKind = 'inbound' | 'outbound' | 'transfer' | 'adjustment' | 'reservation';

export interface StockBalance {
  readonly tenantId: TenantId;
  readonly branchId: BranchId;
  readonly productId: ProductId;
  readonly onHand: number;
  readonly reserved: number;
  readonly available: number;
}
