import type { BranchId, ProductId, TenantId } from '../common';

export type StockMovementKind =
  | 'INBOUND'
  | 'OUTBOUND'
  | 'SALE'
  | 'RETURN'
  | 'TRANSFER'
  | 'ADJUSTMENT'
  | 'COUNT'
  | 'DAMAGE'
  | 'LOSS'
  | 'BONUS'
  | 'RESERVE'
  | 'RELEASE';

export interface StockBalance {
  readonly tenantId: TenantId;
  readonly branchId: BranchId;
  readonly productId: ProductId;
  readonly warehouseId: string;
  readonly physical: number;
  readonly reserved: number;
  readonly blocked: number;
  readonly available: number;
  readonly inTransit: number;
  readonly damaged: number;
  readonly consigned: number;
  readonly version: number;
}

export interface StockMovement {
  readonly id: string;
  readonly tenantId: TenantId;
  readonly branchId: BranchId;
  readonly warehouseId: string;
  readonly productId: ProductId;
  readonly kind: StockMovementKind;
  readonly quantity: number;
  readonly before: StockBalance;
  readonly after: StockBalance;
  readonly sourceId: string;
  readonly destinationId: string | null;
  readonly document: string | null;
  readonly reason: string;
  readonly userId: string;
  readonly occurredAt: string;
  readonly idempotencyKey: string;
}

export type TransferStatus =
  'PENDING' | 'APPROVED' | 'PICKING' | 'IN_TRANSIT' | 'RECEIVED' | 'DIVERGENCE' | 'CANCELLED';
export interface TransferItem {
  readonly productId: ProductId;
  readonly lotId: string | null;
  readonly expiresOn: string | null;
  readonly requested: number;
  readonly shipped: number;
  readonly received: number;
}
export interface StockTransfer {
  readonly id: string;
  readonly tenantId: TenantId;
  readonly originBranchId: BranchId;
  readonly originWarehouseId: string;
  readonly destinationBranchId: BranchId;
  readonly destinationWarehouseId: string;
  readonly status: TransferStatus;
  readonly items: readonly TransferItem[];
  readonly history: readonly {
    status: TransferStatus;
    userId: string;
    occurredAt: string;
    note: string;
  }[];
}
