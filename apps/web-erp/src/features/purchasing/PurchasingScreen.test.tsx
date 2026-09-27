import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { PurchaseOrder } from './purchasing.api';

/** Fase 6 — piloto da Form Grammar. Estes testes travam o que NÃO podia
 *  mudar (payloads, validações, regra das duas cotações) e o que a mudança
 *  trouxe (rótulo real em todo controle, abas com teclado). */

vi.mock('./purchasing.api', () => ({
  addQuote: vi.fn(),
  createPurchaseOrder: vi.fn(),
  devSignIn: vi.fn(),
  isSignedIn: vi.fn(() => true),
  listPurchaseOrders: vi.fn(),
  receiveFromXml: vi.fn(),
  receiveManual: vi.fn(),
  selectSupplier: vi.fn(),
}));
const api = await import('./purchasing.api');
const { PurchasingScreen } = await import('./PurchasingScreen');

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

let raiz: Root;
let caixa: HTMLDivElement;

const pedido = (parcial: Partial<PurchaseOrder>): PurchaseOrder => ({
  id: 'abcdef1234567890',
  branchId: 'matriz',
  warehouseId: 'wh-central',
  status: 'EM_COTACAO',
  supplierId: null,
  items: [{ productId: 'PROD-1', quantityOrdered: 10, unitCostCentavos: 0, quantityReceived: 0 }],
  quotes: [],
  sourceSuggestionIds: [],
  version: 1,
  createdAt: '2026-09-27T12:00:00Z',
  ...parcial,
});

const digitar = (el: HTMLInputElement | HTMLTextAreaElement, valor: string) => {
  const proto = el instanceof HTMLTextAreaElement ? HTMLTextAreaElement : HTMLInputElement;
  Object.getOwnPropertyDescriptor(proto.prototype, 'value')?.set?.call(el, valor);
  el.dispatchEvent(new Event('input', { bubbles: true }));
};
const botao = (nome: string) =>
  [...caixa.querySelectorAll('button')].find((b) => b.textContent?.trim() === nome);
const porRotulo = (rotulo: string) =>
  caixa.querySelector<HTMLInputElement>(`[aria-label="${rotulo}"]`) ??
  ([...caixa.querySelectorAll('label')].find((l) => l.textContent === rotulo)?.control as
    HTMLInputElement | undefined);

const montar = async (pedidos: PurchaseOrder[]) => {
  vi.mocked(api.listPurchaseOrders).mockResolvedValue(pedidos);
  await act(async () => raiz.render(<PurchasingScreen />));
};
const abrir = async () => {
  await act(async () => caixa.querySelector<HTMLButtonElement>('[data-pedido]')?.click());
};

beforeEach(() => {
  caixa = document.createElement('div');
  document.body.appendChild(caixa);
  raiz = createRoot(caixa);
});

afterEach(() => {
  act(() => raiz.unmount());
  caixa.remove();
  vi.clearAllMocks();
});

describe('PurchasingScreen — Form Grammar sem mudar regra', () => {
  it('todo controle visível tem rótulo real (nada de placeholder como rótulo)', async () => {
    await montar([pedido({})]);
    await abrir();
    const controles = [...caixa.querySelectorAll('input, select, textarea')] as HTMLInputElement[];
    expect(controles.length).toBeGreaterThan(4);
    for (const c of controles)
      expect(c.labels?.length || c.getAttribute('aria-label')).toBeTruthy();
  });

  it('criar pedido vazio mostra o erro junto da ação e não chama a API', async () => {
    await montar([]);
    await act(async () => botao('Criar pedido')?.click());
    expect(api.createPurchaseOrder).not.toHaveBeenCalled();
    const alerta = caixa.querySelector('[role="alert"]');
    expect(alerta?.textContent).toBe('Informe ao menos um produto com quantidade');
  });

  it('criar pedido envia exatamente o mesmo payload de antes', async () => {
    vi.mocked(api.createPurchaseOrder).mockResolvedValue(pedido({}));
    await montar([]);
    act(() => {
      digitar(porRotulo('Produto do item 1')!, ' PROD-9 ');
      digitar(porRotulo('Quantidade do item 1')!, '12.6');
    });
    await act(async () => botao('Criar pedido')?.click());
    expect(api.createPurchaseOrder).toHaveBeenCalledWith({
      branchId: 'matriz',
      warehouseId: 'wh-central',
      items: [{ productId: 'PROD-9', quantityOrdered: 13 }],
    });
  });

  it('com menos de duas cotações, Aprovar fica desabilitado e o aviso §40 aparece', async () => {
    await montar([
      pedido({ quotes: [{ supplierId: 'F1', leadDays: 3, items: [], submittedAt: '' }] }),
    ]);
    await abrir();
    expect(botao('Aprovar')?.disabled).toBe(true);
    expect(caixa.textContent).toContain('Precisa de pelo menos duas cotações para aprovar (§40).');
  });

  it('cotação converte o preço em centavos como antes', async () => {
    vi.mocked(api.addQuote).mockResolvedValue(pedido({}));
    await montar([pedido({})]);
    await abrir();
    act(() => {
      digitar(porRotulo('Fornecedor')!, 'FORN-A');
      digitar(porRotulo('Preço unitário de PROD-1, em reais')!, '12.5');
    });
    await act(async () => botao('Enviar cotação')?.click());
    expect(api.addQuote).toHaveBeenCalledWith('abcdef1234567890', {
      supplierId: 'FORN-A',
      leadDays: 5,
      items: [{ productId: 'PROD-1', unitCostCentavos: 1250 }],
    });
  });

  it('abas de recebimento: seta para a direita troca para XML e leva o foco', async () => {
    await montar([pedido({ status: 'APROVADO' })]);
    await abrir();
    const manual = caixa.querySelector<HTMLButtonElement>('[role="tab"][aria-selected="true"]');
    expect(manual?.textContent).toBe('Conferência manual');
    act(() => {
      manual?.focus();
      manual?.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowRight', bubbles: true }));
    });
    const ativa = caixa.querySelector<HTMLButtonElement>('[role="tab"][aria-selected="true"]');
    expect(ativa?.textContent).toBe('Entrada por XML (DF-e)');
    expect(document.activeElement).toBe(ativa);
    expect(caixa.querySelector('[role="tabpanel"] textarea')).not.toBeNull();
    expect(botao('Importar XML e confirmar recebimento')?.disabled).toBe(true);
  });
});
