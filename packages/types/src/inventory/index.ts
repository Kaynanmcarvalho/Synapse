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

/** §8: lote, fabricacao, validade, fornecedor, quantidade — e a base do FEFO. */
export interface Lot {
  readonly id: string;
  readonly tenantId: TenantId;
  readonly branchId: BranchId;
  readonly warehouseId: string;
  readonly productId: ProductId;
  readonly supplierId: string | null;
  readonly manufacturedAt: string;
  readonly expiresAt: string;
  readonly initialQuantity: number;
  readonly physical: number;
  readonly reserved: number;
  readonly createdAt: string;
  readonly createdBy: string;
}

/** Quanto falta para vencer, na granularidade dos alertas do §46. `EXPIRED`
 *  quando a validade ja passou — nunca entra em venda nova (c12-4). */
export type ExpiryAlertLevel = 'D90' | 'D60' | 'D30' | 'D15' | 'EXPIRED';

export interface ExpiringLot {
  readonly lot: Lot;
  readonly daysUntilExpiry: number;
  readonly alertLevel: ExpiryAlertLevel;
}

/** O que `LotService.reserveFefo` devolve: de quais lotes a quantidade saiu,
 *  na ordem em que o FEFO consumiu — a rastreabilidade do c12-7. */
export interface LotReservation {
  readonly lotId: string;
  readonly expiresAt: string;
  readonly quantity: number;
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
