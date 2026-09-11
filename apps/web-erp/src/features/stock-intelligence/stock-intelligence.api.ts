import { apiRequest } from '../../lib/dev-auth';

export { devSignIn, isSignedIn } from '../../lib/dev-auth';

export type AbcClass = 'A' | 'B' | 'C';

export interface StockIntelligenceMetric {
  readonly id: string;
  readonly branchId: string;
  readonly productId: string;
  readonly productName: string;
  readonly sku: string;
  readonly windowDays: number;
  readonly revenue: number;
  readonly quantitySold: number;
  readonly margin: number;
  readonly abc: {
    readonly byRevenue: AbcClass;
    readonly byQuantity: AbcClass;
    readonly byMargin: AbcClass;
  };
  readonly stockOnHand: number;
  readonly avgDailySales: number;
  readonly turnoverRate: number;
  readonly coverageDays: number | null;
  readonly isDeadStock: boolean;
  readonly isExcess: boolean;
  readonly stockoutCount: number;
  readonly lastStockoutAt: string | null;
  readonly supplierId: string | null;
  readonly supplierName: string | null;
  readonly leadTimeDays: number;
  readonly safetyStock: number;
  readonly suggestedPurchaseQty: number;
  readonly approvedPurchaseQty: number | null;
  readonly adjustedBy: string | null;
  readonly adjustedAt: string | null;
  readonly adjustmentNote: string | null;
  readonly calculatedAt: string;
}

export interface ListFilters {
  readonly abcClass?: AbcClass;
  readonly onlyDeadStock?: boolean;
  readonly onlyExcess?: boolean;
  readonly onlySuggested?: boolean;
}

const toQuery = (branchId: string, filters: ListFilters = {}): string => {
  const params = new URLSearchParams({ branchId });
  if (filters.abcClass) params.set('abcClass', filters.abcClass);
  if (filters.onlyDeadStock) params.set('onlyDeadStock', 'true');
  if (filters.onlyExcess) params.set('onlyExcess', 'true');
  if (filters.onlySuggested) params.set('onlySuggested', 'true');
  return params.toString();
};

export const listStockIntelligence = (
  branchId: string,
  filters?: ListFilters,
): Promise<StockIntelligenceMetric[]> =>
  apiRequest(`/analytics/stock-intelligence?${toQuery(branchId, filters)}`);

/** Devolve quantos produtos entraram no recálculo — é literalmente o que
 *  `StockIntelligenceService.recalculate` retorna, sem envelope. */
export const recalculateStockIntelligence = (branchId: string): Promise<number> =>
  apiRequest('/analytics/stock-intelligence/recalculate', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ branchId }),
  });

export const adjustSuggestion = (
  productId: string,
  branchId: string,
  approvedPurchaseQty: number,
  note?: string,
): Promise<StockIntelligenceMetric> =>
  apiRequest(`/analytics/stock-intelligence/${productId}/suggestion`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ branchId, approvedPurchaseQty, note }),
  });
