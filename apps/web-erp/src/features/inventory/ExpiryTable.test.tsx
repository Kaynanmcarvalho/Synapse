import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ExpiryTable } from './StockScreen';
import type { ExpiringLot } from './stock.api';

/** Fase 5.2 — ExpiryTable é o laboratório de "click abre, sem seleção
 *  persistente" fora da fila de crédito. A auditoria encontrou que esta
 *  tabela nunca teve destaque de linha "selecionada": clicar/Enter só abre a
 *  gaveta de detalhe, igual a Clientes. Estes testes travam exatamente isso
 *  — não inventam um estado que não existia. */

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

const ALERTA = (parcial: Partial<ExpiringLot> = {}): ExpiringLot => ({
  daysUntilExpiry: 12,
  alertLevel: 'D15',
  ...parcial,
  lot: {
    id: 'lote-abcdefgh12345',
    branchId: 'matriz',
    warehouseId: 'deposito-1',
    productId: 'Leite integral 1L',
    supplierId: null,
    manufacturedAt: '2026-08-01',
    expiresAt: '2026-10-01',
    initialQuantity: 100,
    physical: 40,
    reserved: 5,
    ...parcial.lot,
  },
});

describe('ExpiryTable', () => {
  it('clicar na linha chama onSelect com o alerta certo', () => {
    const onSelect = vi.fn();
    montar(<ExpiryTable alerts={[ALERTA()]} onSelect={onSelect} />);
    act(() =>
      caixa.querySelector('tbody tr')?.dispatchEvent(new MouseEvent('click', { bubbles: true })),
    );
    expect(onSelect).toHaveBeenCalledWith(ALERTA());
  });

  it('Enter na linha focada também abre', () => {
    const onSelect = vi.fn();
    montar(<ExpiryTable alerts={[ALERTA()]} onSelect={onSelect} />);
    act(() =>
      caixa
        .querySelector('tbody tr')
        ?.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true })),
    );
    expect(onSelect).toHaveBeenCalled();
  });

  it('não existe estado "selecionada" — nenhuma linha carrega o Synapse Signal controlado', () => {
    montar(
      <ExpiryTable
        alerts={[ALERTA(), ALERTA({ lot: { id: 'lote-2' } as never })]}
        onSelect={vi.fn()}
      />,
    );
    // O Signal aqui só existe pelo foco de teclado (CSS puro via `group`), não
    // por um `ativo` controlado — não há span com opacidade fixa em 100%.
    const sinalizadores = caixa.querySelectorAll('span.bg-primary');
    sinalizadores.forEach((span) => {
      expect(span.className).toContain('group-focus-visible');
    });
  });

  it('saldo é físico menos reservado, sem cor solta no alerta', () => {
    montar(
      <ExpiryTable
        alerts={[ALERTA({ lot: { physical: 40, reserved: 5 } as never })]}
        onSelect={vi.fn()}
      />,
    );
    expect(caixa.textContent).toContain('35');
    expect(caixa.innerHTML).not.toMatch(/#[0-9a-f]{3,6}/i);
  });

  it('vencido mostra "há N dias" com tom vencido', () => {
    montar(
      <ExpiryTable
        alerts={[ALERTA({ alertLevel: 'EXPIRED', daysUntilExpiry: -7 })]}
        onSelect={vi.fn()}
      />,
    );
    expect(caixa.textContent).toContain('há 7 dias');
    expect(caixa.textContent).toContain('Vencido');
  });

  it('lista vazia mostra o aviso, sem tabela', () => {
    montar(<ExpiryTable alerts={[]} onSelect={vi.fn()} />);
    expect(caixa.querySelector('table')).toBeNull();
    expect(caixa.textContent).toContain('Nenhum lote dentro da janela de alerta');
  });
});
