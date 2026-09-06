import { apiRequest } from '../../lib/dev-auth';

export type ExpiryAlertLevel = 'D90' | 'D60' | 'D30' | 'D15' | 'EXPIRED';

export interface Lot {
  readonly id: string;
  readonly branchId: string;
  readonly warehouseId: string;
  readonly productId: string;
  readonly supplierId: string | null;
  readonly manufacturedAt: string;
  readonly expiresAt: string;
  readonly initialQuantity: number;
  readonly physical: number;
  readonly reserved: number;
}

export interface ExpiringLot {
  readonly lot: Lot;
  readonly daysUntilExpiry: number;
  readonly alertLevel: ExpiryAlertLevel;
}

export const listExpiryAlerts = (): Promise<ExpiringLot[]> =>
  apiRequest('/inventory/lots/expiry-alerts');

export interface CreateLotPayload {
  readonly branchId: string;
  readonly warehouseId: string;
  readonly productId: string;
  readonly manufacturedAt: string;
  readonly expiresAt: string;
  readonly quantity: number;
}

export const createLot = (payload: CreateLotPayload): Promise<Lot> =>
  apiRequest('/inventory/lots', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ ...payload, supplierId: null }),
  });

export interface LotBalance {
  readonly physical: number;
  readonly reserved: number;
  readonly available: number;
  readonly lots: readonly Lot[];
}

export const getLotBalance = (
  branchId: string,
  warehouseId: string,
  productId: string,
): Promise<LotBalance> =>
  apiRequest(
    `/inventory/lots/balance?branchId=${encodeURIComponent(branchId)}&warehouseId=${encodeURIComponent(warehouseId)}&productId=${encodeURIComponent(productId)}`,
  );
