import { describe, expect, it } from 'vitest';
import { filtrar, ordenar, proximaOrdenacaoOuNenhuma } from './colunas';
import type { StockIntelligenceMetric } from './stock-intelligence.api';

/** A tabela de inteligência tem um ciclo de ordenação de 3 estados (o
 *  DataTable legado já tinha isso) — diferente do ciclo de 2 estados da
 *  fila de crédito. Estes testes travam esse contrato, não o comportamento
 *  visual (já coberto pela fundação em packages/sdl). */

const metrica = (parcial: Partial<StockIntelligenceMetric>): StockIntelligenceMetric => ({
  id: parcial.id ?? 'm1',
  branchId: 'matriz',
  productId: 'p1',
  productName: parcial.productName ?? 'Produto',
  sku: parcial.sku ?? 'SKU-1',
  windowDays: 30,
  revenue: 0,
  quantitySold: 0,
  margin: 0,
  abc: { byRevenue: parcial.abc?.byRevenue ?? 'A', byQuantity: 'A', byMargin: 'A' },
  stockOnHand: parcial.stockOnHand ?? 0,
  avgDailySales: 0,
  turnoverRate: parcial.turnoverRate ?? 0,
  coverageDays: parcial.coverageDays ?? null,
  isDeadStock: false,
  isExcess: false,
  stockoutCount: parcial.stockoutCount ?? 0,
  lastStockoutAt: null,
  supplierId: null,
  supplierName: null,
  leadTimeDays: 0,
  safetyStock: 0,
  suggestedPurchaseQty: 0,
  approvedPurchaseQty: parcial.approvedPurchaseQty ?? null,
  adjustedBy: null,
  adjustedAt: null,
  adjustmentNote: null,
  calculatedAt: new Date().toISOString(),
  ...parcial,
});

describe('proximaOrdenacaoOuNenhuma', () => {
  it('primeiro clique ordena crescente', () => {
    expect(proximaOrdenacaoOuNenhuma(null, 'stock')).toEqual({ coluna: 'stock', direcao: 'asc' });
  });

  it('segundo clique na mesma coluna inverte para decrescente', () => {
    expect(proximaOrdenacaoOuNenhuma({ coluna: 'stock', direcao: 'asc' }, 'stock')).toEqual({
      coluna: 'stock',
      direcao: 'desc',
    });
  });

  it('terceiro clique na mesma coluna remove a ordenação — o 3º estado que o DataTable legado tinha', () => {
    expect(proximaOrdenacaoOuNenhuma({ coluna: 'stock', direcao: 'desc' }, 'stock')).toBeNull();
  });

  it('clicar em outra coluna recomeça crescente, mesmo vindo de uma ordenação ativa', () => {
    expect(proximaOrdenacaoOuNenhuma({ coluna: 'stock', direcao: 'desc' }, 'turnover')).toEqual({
      coluna: 'turnover',
      direcao: 'asc',
    });
  });
});

describe('ordenar', () => {
  const linhas = [
    metrica({ id: 'a', stockOnHand: 30 }),
    metrica({ id: 'b', stockOnHand: 10 }),
    metrica({ id: 'c', stockOnHand: 20 }),
  ];

  it('sem ordenação, mantém a ordem original', () => {
    expect(ordenar(linhas, null).map((l) => l.id)).toEqual(['a', 'b', 'c']);
  });

  it('ordena numericamente, não como string', () => {
    expect(ordenar(linhas, { coluna: 'stock', direcao: 'asc' }).map((l) => l.id)).toEqual([
      'b',
      'c',
      'a',
    ]);
  });

  it('coverage nula vai para o fim em ordem crescente (Infinity)', () => {
    const comNulo = [
      metrica({ id: 'x', coverageDays: 5 }),
      metrica({ id: 'y', coverageDays: null }),
      metrica({ id: 'z', coverageDays: 1 }),
    ];
    expect(ordenar(comNulo, { coluna: 'coverage', direcao: 'asc' }).map((l) => l.id)).toEqual([
      'z',
      'x',
      'y',
    ]);
  });
});

describe('filtrar', () => {
  const linhas = [
    metrica({ id: 'a', productName: 'Café Torrado', sku: 'CAF-001' }),
    metrica({ id: 'b', productName: 'Açúcar Refinado', sku: 'ACU-002' }),
  ];

  it('sem termo, devolve tudo', () => {
    expect(filtrar(linhas, '').map((l) => l.id)).toEqual(['a', 'b']);
  });

  it('casa por nome, sem diferenciar caixa', () => {
    expect(filtrar(linhas, 'CAFÉ').map((l) => l.id)).toEqual(['a']);
  });

  it('casa por SKU', () => {
    expect(filtrar(linhas, 'acu-002').map((l) => l.id)).toEqual(['b']);
  });
});
