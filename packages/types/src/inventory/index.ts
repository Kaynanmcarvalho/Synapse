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

export type InventoryCountType = 'GENERAL' | 'PARTIAL' | 'CATEGORY' | 'WAREHOUSE' | 'CYCLE';
export type InventoryMovementPolicy = 'FREEZE' | 'SNAPSHOT';
export type InventoryCountStatus = 'COUNTING' | 'REVIEW' | 'ADJUSTED' | 'CANCELLED';

export interface InventoryCountLine {
  readonly productId: ProductId;
  readonly barcode: string;
  readonly name: string;
  readonly systemQuantity: number;
  readonly countedQuantity: number | null;
  readonly difference: number;
  readonly unitCost: number;
  readonly differenceCost: number;
  readonly counterId: string | null;
  readonly countedAt: string | null;
}

export interface InventoryCount {
  readonly id: string;
  readonly tenantId: TenantId;
  readonly branchId: BranchId;
  readonly warehouseId: string;
  readonly type: InventoryCountType;
  readonly movementPolicy: InventoryMovementPolicy;
  readonly status: InventoryCountStatus;
  readonly categoryId: string | null;
  readonly responsibleId: string;
  readonly startedAt: string;
  readonly reviewedAt: string | null;
  readonly adjustedAt: string | null;
  readonly lines: readonly InventoryCountLine[];
}
