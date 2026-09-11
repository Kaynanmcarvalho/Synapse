import type { BranchId, ProductId, TenantId } from '../common';

export type AbcClass = 'A' | 'B' | 'C';

/** Classificação ABC do produto sob os três critérios do §37: quanto ele
 *  representa do faturamento, da quantidade vendida e da margem, cada um
 *  calculado pela curva de Pareto (80/95/100%) entre os produtos da filial. */
export interface AbcClassification {
  readonly byRevenue: AbcClass;
  readonly byQuantity: AbcClass;
  readonly byMargin: AbcClass;
}

/** Uma linha por produto/filial, recalculada pelo job periódico (§39). Guarda
 *  tanto os indicadores de leitura (giro, cobertura, ruptura) quanto a
 *  sugestão de compra pronta para ajuste manual antes de virar pedido. */
export interface StockIntelligenceMetric {
  readonly id: string; // `${branchId}_${productId}`
  readonly tenantId: TenantId;
  readonly branchId: BranchId;
  readonly productId: ProductId;
  readonly productName: string;
  readonly sku: string;

  readonly windowDays: number;
  readonly revenue: number;
  readonly quantitySold: number;
  readonly margin: number;
  readonly abc: AbcClassification;

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

  /** Ajuste manual do §39 ("tela de sugestão com ajuste antes de virar
   *  pedido") — null enquanto ninguém revisou a sugestão calculada. */
  readonly approvedPurchaseQty: number | null;
  readonly adjustedBy: string | null;
  readonly adjustedAt: string | null;
  readonly adjustmentNote: string | null;

  readonly calculatedAt: string;
}
