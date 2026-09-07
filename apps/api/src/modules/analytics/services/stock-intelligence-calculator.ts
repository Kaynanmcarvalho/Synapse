import type {
  AbcClass,
  Product,
  StockBalance,
  StockIntelligenceMetric,
  StockMovement,
  Supplier,
} from '@synapse/types';

const DEFAULT_LEAD_TIME_DAYS = 7;
/** Cobertura acima disso, com produto girando, já é excesso de estoque
 *  (§38) — um limiar operacional revisável, não uma constante do domínio. */
const EXCESS_COVERAGE_DAYS = 120;

export interface ProductSalesAggregate {
  readonly quantitySold: number;
  readonly stockoutCount: number;
  readonly lastStockoutAt: string | null;
}

/** Agrupa os movimentos de venda por produto e, na mesma varredura, detecta
 *  toda ruptura: cada vez que o saldo disponível cruza de positivo para
 *  zero ou menos. Os movimentos de cada produto precisam estar em ordem
 *  cronológica para o cruzamento fazer sentido — por isso ordena antes. */
export function aggregateSales(
  movements: readonly StockMovement[],
): Map<string, ProductSalesAggregate> {
  const byProduct = new Map<string, StockMovement[]>();
  for (const movement of movements) {
    const list = byProduct.get(movement.productId) ?? [];
    list.push(movement);
    byProduct.set(movement.productId, list);
  }

  const result = new Map<string, ProductSalesAggregate>();
  for (const [productId, list] of byProduct) {
    const ordered = [...list].sort((a, b) => a.occurredAt.localeCompare(b.occurredAt));
    let quantitySold = 0;
    let stockoutCount = 0;
    let lastStockoutAt: string | null = null;
    for (const movement of ordered) {
      if (movement.kind === 'SALE') quantitySold += movement.quantity;
      if (movement.kind === 'RETURN') quantitySold -= movement.quantity;
      const isAvailable = movement.after.available > 0;
      if (movement.before.available > 0 && !isAvailable) {
        stockoutCount += 1;
        lastStockoutAt = movement.occurredAt;
      }
    }
    result.set(productId, { quantitySold, stockoutCount, lastStockoutAt });
  }
  return result;
}

/** Curva ABC clássica por Pareto (§37): ordena do maior valor para o menor,
 *  acumula a participação no total e corta em 80% (A), 95% (B) e o resto
 *  (C). Sem vendas no período (total <= 0), todo mundo cai em C — não há
 *  faturamento/quantidade/margem para classificar. */
export function classifyAbc(values: ReadonlyMap<string, number>): Map<string, AbcClass> {
  const total = [...values.values()].reduce((sum, value) => sum + Math.max(value, 0), 0);
  const classes = new Map<string, AbcClass>();
  if (total <= 0) {
    for (const id of values.keys()) classes.set(id, 'C');
    return classes;
  }

  const sorted = [...values.entries()].sort((a, b) => b[1] - a[1]);
  let cumulative = 0;
  for (const [id, value] of sorted) {
    // Classifica pelo acumulado ANTES deste item, não depois: é o item que
    // cruza os 80%/95% que decide onde a faixa anterior termina, não o
    // acumulado já incluindo ele — senão um único item com 100% do total
    // (nada abaixo dele para comparar) cairia em C em vez de A.
    const shareBefore = cumulative / total;
    classes.set(id, shareBefore < 0.8 ? 'A' : shareBefore < 0.95 ? 'B' : 'C');
    cumulative += Math.max(value, 0);
  }
  return classes;
}

export interface CalculateMetricInput {
  readonly tenantId: string;
  readonly branchId: string;
  readonly windowDays: number;
  readonly product: Product;
  readonly balance: StockBalance | null;
  readonly sales: ProductSalesAggregate | undefined;
  readonly supplier: Supplier | null;
  readonly abc: StockIntelligenceMetric['abc'];
  readonly now: Date;
}

interface VelocityResult {
  readonly turnoverRate: number;
  readonly coverageDays: number | null;
  readonly isDeadStock: boolean;
  readonly isExcess: boolean;
}

/** Giro, cobertura e as duas flags de saúde de estoque (§38) — isolado do
 *  resto do cálculo só para manter cada função abaixo do limite de
 *  complexidade do lint, não porque o resultado seja reutilizado em outro
 *  lugar. */
function computeVelocity(
  quantitySold: number,
  stockOnHand: number,
  avgDailySales: number,
  maxStock: number,
): VelocityResult {
  // Giro: vendas da janela contra o estoque atual. Sem um histórico de saldo
  // médio diário guardado à parte, é a proxy disponível — por isso usa
  // max(estoque, 1) em vez de dividir por zero quando o saldo zerou.
  const turnoverRate = quantitySold / Math.max(stockOnHand, 1);
  const coverageDays = avgDailySales > 0 ? stockOnHand / avgDailySales : null;
  const isDeadStock = quantitySold === 0 && stockOnHand > 0;
  const isExcess =
    (coverageDays !== null && coverageDays > EXCESS_COVERAGE_DAYS) ||
    (maxStock > 0 && stockOnHand > maxStock);
  return { turnoverRate, coverageDays, isDeadStock, isExcess };
}

/** §39: demanda esperada durante o lead time do fornecedor, mais a reserva
 *  de segurança, menos o que já está disponível. Nunca sugere um número
 *  negativo — estoque acima do necessário não "deve" unidades pro futuro. */
function computeSuggestion(
  avgDailySales: number,
  leadTimeDays: number,
  safetyStock: number,
  stockOnHand: number,
): number {
  const raw = avgDailySales * leadTimeDays + safetyStock - stockOnHand;
  return Math.max(0, Math.ceil(raw));
}

/** O núcleo do §38/§39: um produto entra, a linha completa de indicadores
 *  sai. Nenhuma leitura de rede aqui — só cálculo, para testar sem
 *  Firestore e sem mockar nada além do relógio (`now`).
 *
 *  Limitação conhecida: não existe histórico de preço praticado por venda
 *  (Order/PosSale ainda não persistem em Firestore — ver nota do módulo de
 *  vendas), então faturamento e margem são reconstituídos a partir da
 *  quantidade vendida (das movimentações de estoque, que são persistidas)
 *  multiplicada pelo preço/custo *atuais* do produto. Sub ou superestima o
 *  período em que o preço mudou; é a base disponível até o módulo de vendas
 *  ganhar persistência própria. */
export function calculateMetric(input: CalculateMetricInput): StockIntelligenceMetric {
  const { tenantId, branchId, windowDays, product, balance, sales, supplier, abc, now } = input;

  const stockOnHand = balance?.available ?? 0;
  const quantitySold = sales?.quantitySold ?? 0;
  const avgDailySales = quantitySold / windowDays;
  const revenue = quantitySold * product.pricing.salePrice;
  const margin = quantitySold * (product.pricing.salePrice - product.pricing.averageCost);

  const { turnoverRate, coverageDays, isDeadStock, isExcess } = computeVelocity(
    quantitySold,
    stockOnHand,
    avgDailySales,
    product.logistics.maxStock,
  );

  const leadTimeDays = supplier?.averageLeadDays ?? DEFAULT_LEAD_TIME_DAYS;
  const safetyStock = supplier?.safetyStockByProduct?.[product.id] ?? product.logistics.minStock;
  const suggestedPurchaseQty = computeSuggestion(
    avgDailySales,
    leadTimeDays,
    safetyStock,
    stockOnHand,
  );

  return {
    id: `${branchId}_${product.id}`,
    tenantId: tenantId as StockIntelligenceMetric['tenantId'],
    branchId: branchId as StockIntelligenceMetric['branchId'],
    productId: product.id,
    productName: product.name,
    sku: product.sku,
    windowDays,
    revenue,
    quantitySold,
    margin,
    abc,
    stockOnHand,
    avgDailySales,
    turnoverRate,
    coverageDays,
    isDeadStock,
    isExcess,
    stockoutCount: sales?.stockoutCount ?? 0,
    lastStockoutAt: sales?.lastStockoutAt ?? null,
    supplierId: supplier?.id ?? null,
    supplierName: supplier?.tradeName ?? null,
    leadTimeDays,
    safetyStock,
    suggestedPurchaseQty,
    approvedPurchaseQty: null,
    adjustedBy: null,
    adjustedAt: null,
    adjustmentNote: null,
    calculatedAt: now.toISOString(),
  };
}
