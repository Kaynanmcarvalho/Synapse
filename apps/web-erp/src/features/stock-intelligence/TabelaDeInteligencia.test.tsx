import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { TabelaDeInteligencia } from './TabelaDeInteligencia';
import type { StockIntelligenceMetric } from './stock-intelligence.api';

/** Fase 5.1: migração do `components/DataTable.tsx` legado para a fundação
 *  de DataGrid. Estes testes travam o comportamento que já existia
 *  (ordenação de 3 estados, visibilidade de coluna, busca livre) — a
 *  aparência é coberta pela auditoria visual com Playwright. */

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

let raiz: Root;
let caixa: HTMLDivElement;
const montar = (conteudo: React.ReactNode) => act(() => raiz.render(conteudo));

beforeEach(() => {
  caixa = document.createElement('div');
  document.body.appendChild(caixa);
  raiz = createRoot(caixa);
});

afterEach(() => {
  act(() => raiz.unmount());
  caixa.remove();
});

const METRICA = (parcial: Partial<StockIntelligenceMetric>): StockIntelligenceMetric =>
  ({
    id: 'm1',
    branchId: 'matriz',
    productId: 'p1',
    productName: 'Café Torrado',
    sku: 'CAF-001',
    windowDays: 30,
    revenue: 0,
    quantitySold: 0,
    margin: 0,
    abc: { byRevenue: 'A', byQuantity: 'A', byMargin: 'A' },
    stockOnHand: 12,
    avgDailySales: 0,
    turnoverRate: 2.5,
    coverageDays: 8,
    isDeadStock: false,
    isExcess: false,
    stockoutCount: 0,
    lastStockoutAt: null,
    supplierId: null,
    supplierName: null,
    leadTimeDays: 0,
    safetyStock: 0,
    suggestedPurchaseQty: 5,
    approvedPurchaseQty: null,
    adjustedBy: null,
    adjustedAt: null,
    adjustmentNote: null,
    calculatedAt: new Date().toISOString(),
    ...parcial,
  }) as StockIntelligenceMetric;

describe('TabelaDeInteligencia', () => {
  it('mostra ABC como Status (não pílula hex) e sem hex cru no HTML', () => {
    montar(
      <TabelaDeInteligencia
        linhas={[METRICA({})]}
        branchId="matriz"
        busca=""
        aoBuscar={vi.fn()}
        avisoDeVazio="vazio"
        aoAjustar={vi.fn()}
      />,
    );
    expect(caixa.textContent).toContain('Café Torrado');
    expect(caixa.textContent).toContain('A');
    expect(caixa.innerHTML).not.toMatch(/#[0-9a-f]{3,6}/i);
  });

  it('cabeçalho ordenável cicla asc → desc → nenhuma ordenação (3 estados, igual ao DataTable legado)', () => {
    montar(
      <TabelaDeInteligencia
        linhas={[METRICA({ id: 'a', stockOnHand: 30 }), METRICA({ id: 'b', stockOnHand: 10 })]}
        branchId="matriz"
        busca=""
        aoBuscar={vi.fn()}
        avisoDeVazio="vazio"
        aoAjustar={vi.fn()}
      />,
    );
    const botaoEstoque = [...caixa.querySelectorAll('th')]
      .find((th) => th.textContent?.includes('Estoque'))
      ?.querySelector('button');

    const idsNaOrdem = () => [...caixa.querySelectorAll('tbody tr')].map((tr) => tr.textContent);

    act(() => botaoEstoque?.dispatchEvent(new MouseEvent('click', { bubbles: true })));
    expect(idsNaOrdem()[0]).toContain('10'); // asc: 10 antes de 30

    act(() => botaoEstoque?.dispatchEvent(new MouseEvent('click', { bubbles: true })));
    expect(idsNaOrdem()[0]).toContain('30'); // desc: 30 antes de 10

    act(() => botaoEstoque?.dispatchEvent(new MouseEvent('click', { bubbles: true })));
    expect(idsNaOrdem()[0]).toContain('30'); // 3º clique: volta à ordem original (a=30 já era o primeiro)
  });

  it('busca livre filtra por nome ou SKU', () => {
    montar(
      <TabelaDeInteligencia
        linhas={[METRICA({ id: 'a', productName: 'Café Torrado', sku: 'CAF-001' })]}
        branchId="matriz"
        busca="zzz-nao-existe"
        aoBuscar={vi.fn()}
        avisoDeVazio="Nenhum indicador"
        aoAjustar={vi.fn()}
      />,
    );
    expect(caixa.querySelectorAll('tbody tr')).toHaveLength(0);
    expect(caixa.textContent).toContain('Nenhum indicador');
  });

  it('menu de Colunas oculta a coluna do cabeçalho e das linhas', () => {
    montar(
      <TabelaDeInteligencia
        linhas={[METRICA({})]}
        branchId="matriz"
        busca=""
        aoBuscar={vi.fn()}
        avisoDeVazio="vazio"
        aoAjustar={vi.fn()}
      />,
    );
    expect(
      [...caixa.querySelectorAll('th')].some((th) => th.textContent?.includes('Cobertura')),
    ).toBe(true);

    const botaoColunas = [...caixa.querySelectorAll('button')].find((b) =>
      b.textContent?.includes('Colunas'),
    );
    act(() => botaoColunas?.dispatchEvent(new MouseEvent('click', { bubbles: true })));
    const itemCobertura = [...caixa.querySelectorAll('[role="menuitemcheckbox"]')].find((item) =>
      item.textContent?.includes('Cobertura'),
    );
    act(() => itemCobertura?.dispatchEvent(new MouseEvent('click', { bubbles: true })));

    expect(
      [...caixa.querySelectorAll('th')].some((th) => th.textContent?.includes('Cobertura')),
    ).toBe(false);
  });
});
