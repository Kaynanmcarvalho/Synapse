import type { Product, StockBalance, StockMovement, Supplier } from '@synapse/types';
import { aggregateSales, calculateMetric, classifyAbc } from './stock-intelligence-calculator';

const balance = (available: number): StockBalance => ({
  tenantId: 'tenant' as StockBalance['tenantId'],
  branchId: 'branch' as StockBalance['branchId'],
  productId: 'p1' as StockBalance['productId'],
  warehouseId: 'wh',
  physical: available,
  reserved: 0,
  blocked: 0,
  available,
  inTransit: 0,
  damaged: 0,
  consigned: 0,
  version: 1,
});

const movement = (
  productId: string,
  quantity: number,
  occurredAt: string,
  afterAvailable: number,
): StockMovement => ({
  id: `${productId}-${occurredAt}`,
  tenantId: 'tenant' as StockMovement['tenantId'],
  branchId: 'branch' as StockMovement['branchId'],
  warehouseId: 'wh',
  productId: productId as StockMovement['productId'],
  kind: 'SALE',
  quantity,
  before: balance(afterAvailable + quantity),
  after: balance(afterAvailable),
  sourceId: 'order',
  destinationId: null,
  document: null,
  reason: 'venda',
  userId: 'user',
  occurredAt,
  idempotencyKey: `${productId}-${occurredAt}`,
});

const product = (overrides: Partial<Product> = {}): Product =>
  ({
    id: 'p1',
    tenantId: 'tenant',
    sku: 'SKU-1',
    internalCode: null,
    ean: null,
    name: 'Produto 1',
    shortDescription: null,
    brand: null,
    manufacturer: null,
    supplierId: null,
    categoryId: null,
    subcategoryId: null,
    photoUrl: null,
    status: 'active',
    logistics: {
      unit: 'UN',
      weightKg: null,
      packaging: null,
      quantityPerPackage: 1,
      minStock: 10,
      maxStock: 0,
      tracksLot: false,
      tracksExpiration: false,
    },
    pricing: {
      cost: 5,
      averageCost: 5,
      lastCost: 5,
      salePrice: 10,
      promotionalPrice: null,
      marginPercent: 50,
    },
    fiscal: {
      ncm: '0000',
      cest: null,
      defaultCfop: '5102',
      cst: null,
      csosn: null,
      origin: 0,
      pisCode: null,
      cofinsCode: null,
      ipiCode: null,
      icmsCode: null,
    },
    createdAt: '2026-01-01T00:00:00.000Z',
    createdBy: { uid: 'u', email: '', name: '', source: 'api' },
    updatedAt: '2026-01-01T00:00:00.000Z',
    updatedBy: { uid: 'u', email: '', name: '', source: 'api' },
    version: 1,
    ...overrides,
  }) as Product;

describe('aggregateSales', () => {
  it('soma a quantidade vendida por produto', () => {
    const result = aggregateSales([
      movement('p1', 5, '2026-01-01T10:00:00.000Z', 95),
      movement('p1', 3, '2026-01-02T10:00:00.000Z', 92),
      movement('p2', 7, '2026-01-01T10:00:00.000Z', 10),
    ]);
    expect(result.get('p1')?.quantitySold).toBe(8);
    expect(result.get('p2')?.quantitySold).toBe(7);
  });

  it('detecta ruptura só na transição de disponível para zerado', () => {
    const result = aggregateSales([
      movement('p1', 5, '2026-01-01T10:00:00.000Z', 5),
      movement('p1', 5, '2026-01-02T10:00:00.000Z', 0), // cruza pra zero: 1 ruptura
      movement('p1', 2, '2026-01-03T10:00:00.000Z', -2), // já estava zerado: não conta de novo
    ]);
    const aggregate = result.get('p1');
    expect(aggregate?.stockoutCount).toBe(1);
    expect(aggregate?.lastStockoutAt).toBe('2026-01-02T10:00:00.000Z');
  });

  it('conta uma segunda ruptura após reabastecer e zerar de novo', () => {
    const result = aggregateSales([
      movement('p1', 5, '2026-01-01T10:00:00.000Z', 0), // ruptura 1
      { ...movement('p1', 20, '2026-01-02T10:00:00.000Z', 20), kind: 'INBOUND' }, // reabastece
      movement('p1', 20, '2026-01-03T10:00:00.000Z', 0), // ruptura 2
    ]);
    expect(result.get('p1')?.stockoutCount).toBe(2);
  });

  it('não ordenados na entrada ainda produz o resultado correto (ordena por occurredAt)', () => {
    const result = aggregateSales([
      movement('p1', 5, '2026-01-03T10:00:00.000Z', 0),
      movement('p1', 5, '2026-01-01T10:00:00.000Z', 10),
    ]);
    expect(result.get('p1')?.quantitySold).toBe(10);
    expect(result.get('p1')?.stockoutCount).toBe(1);
  });
});

describe('classifyAbc', () => {
  it('classifica pela curva de Pareto 80/95/100', () => {
    const values = new Map([
      ['a', 800],
      ['b', 150],
      ['c', 50],
    ]);
    const classes = classifyAbc(values);
    expect(classes.get('a')).toBe('A'); // 80% acumulado
    expect(classes.get('b')).toBe('B'); // 95% acumulado
    expect(classes.get('c')).toBe('C'); // resto
  });

  it('joga tudo em C quando não há valor nenhum no período', () => {
    const classes = classifyAbc(
      new Map([
        ['a', 0],
        ['b', 0],
      ]),
    );
    expect(classes.get('a')).toBe('C');
    expect(classes.get('b')).toBe('C');
  });

  it('ignora valores negativos na participação, sem quebrar', () => {
    const classes = classifyAbc(
      new Map([
        ['a', 100],
        ['b', -10],
      ]),
    );
    expect(classes.get('a')).toBe('A');
    expect(classes.get('b')).toBe('C');
  });
});

describe('calculateMetric', () => {
  const now = new Date('2026-04-01T00:00:00.000Z');

  it('calcula giro, cobertura e sugestão de compra', () => {
    const metric = calculateMetric({
      tenantId: 'tenant',
      branchId: 'branch',
      windowDays: 90,
      product: product(),
      balance: balance(20),
      sales: { quantitySold: 180, stockoutCount: 0, lastStockoutAt: null }, // 2/dia
      supplier: { averageLeadDays: 5 } as Supplier,
      abc: { byRevenue: 'A', byQuantity: 'A', byMargin: 'A' },
      now,
    });

    expect(metric.avgDailySales).toBe(2); // 180/90
    expect(metric.coverageDays).toBe(10); // 20 disponível / 2 por dia
    expect(metric.turnoverRate).toBe(9); // 180 vendido / 20 em estoque
    // suggestão = 2*5 (demanda no lead time) + 10 (segurança) - 20 (disponível) = 0
    expect(metric.suggestedPurchaseQty).toBe(0);
    expect(metric.leadTimeDays).toBe(5);
  });

  it('sugere compra quando o estoque não cobre a demanda do lead time', () => {
    const metric = calculateMetric({
      tenantId: 'tenant',
      branchId: 'branch',
      windowDays: 90,
      product: product(),
      balance: balance(5),
      sales: { quantitySold: 180, stockoutCount: 1, lastStockoutAt: '2026-03-20T00:00:00.000Z' },
      supplier: { averageLeadDays: 5 } as Supplier,
      abc: { byRevenue: 'A', byQuantity: 'A', byMargin: 'A' },
      now,
    });
    // 2*5 + 10 - 5 = 15
    expect(metric.suggestedPurchaseQty).toBe(15);
    expect(metric.stockoutCount).toBe(1);
  });

  it('usa o lead time padrão quando o produto não tem fornecedor', () => {
    const metric = calculateMetric({
      tenantId: 'tenant',
      branchId: 'branch',
      windowDays: 90,
      product: product(),
      balance: balance(0),
      sales: undefined,
      supplier: null,
      abc: { byRevenue: 'C', byQuantity: 'C', byMargin: 'C' },
      now,
    });
    expect(metric.leadTimeDays).toBe(7);
    expect(metric.avgDailySales).toBe(0);
    expect(metric.coverageDays).toBeNull();
  });

  it('marca estoque parado: tem saldo mas zero venda na janela', () => {
    const metric = calculateMetric({
      tenantId: 'tenant',
      branchId: 'branch',
      windowDays: 90,
      product: product(),
      balance: balance(50),
      sales: undefined,
      supplier: null,
      abc: { byRevenue: 'C', byQuantity: 'C', byMargin: 'C' },
      now,
    });
    expect(metric.isDeadStock).toBe(true);
    expect(metric.isExcess).toBe(false);
  });

  it('marca excesso quando o estoque passa do maxStock do produto', () => {
    const metric = calculateMetric({
      tenantId: 'tenant',
      branchId: 'branch',
      windowDays: 90,
      product: product({ logistics: { ...product().logistics, maxStock: 30 } }),
      balance: balance(50),
      sales: { quantitySold: 9, stockoutCount: 0, lastStockoutAt: null },
      supplier: null,
      abc: { byRevenue: 'C', byQuantity: 'C', byMargin: 'C' },
      now,
    });
    expect(metric.isExcess).toBe(true);
    expect(metric.isDeadStock).toBe(false);
  });

  it('não sugere quantidade negativa quando o estoque já cobre tudo', () => {
    const metric = calculateMetric({
      tenantId: 'tenant',
      branchId: 'branch',
      windowDays: 90,
      product: product(),
      balance: balance(1000),
      sales: { quantitySold: 9, stockoutCount: 0, lastStockoutAt: null },
      supplier: { averageLeadDays: 5 } as Supplier,
      abc: { byRevenue: 'C', byQuantity: 'C', byMargin: 'C' },
      now,
    });
    expect(metric.suggestedPurchaseQty).toBe(0);
  });
});
