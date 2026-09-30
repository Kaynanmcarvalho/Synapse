import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { PurchaseOrder } from './purchasing.api';

/** Fase 6 — piloto da Form Grammar. Fase 7.3 — redesign de composição:
 *  "Novo pedido" virou Dialogo (era permanentemente fixo na barra lateral),
 *  Itens e Conferência manual viraram uma tabela só (era duas listas
 *  repetindo os mesmos produtos). Estes testes travam o que NÃO podia mudar
 *  (payloads, validações, regra das duas cotações) e o que mudou de
 *  verdade. */

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
/** Busca em `document.body`, não só em `caixa`: o Dialogo de "Novo pedido"
 *  (Fase 7.3) é renderizado via portal direto no body. */
const botao = (nome: string) =>
  [...document.body.querySelectorAll('button')].find((b) => b.textContent?.trim() === nome);
const porRotulo = (rotulo: string) =>
  document.body.querySelector<HTMLInputElement>(`[aria-label="${rotulo}"]`) ??
  ([...document.body.querySelectorAll('label')].find((l) => l.textContent === rotulo)?.control as
    HTMLInputElement | undefined);

const montar = async (pedidos: PurchaseOrder[]) => {
  vi.mocked(api.listPurchaseOrders).mockResolvedValue(pedidos);
  await act(async () => raiz.render(<PurchasingScreen />));
};
const abrir = async () => {
  await act(async () => caixa.querySelector<HTMLButtonElement>('[data-pedido]')?.click());
};
const dialogo = () => document.body.querySelector<HTMLElement>('[role="dialog"]');
const abrirNovoPedido = async () => {
  await act(async () => botao('Novo pedido')?.click());
};

beforeEach(() => {
  caixa = document.createElement('div');
  document.body.appendChild(caixa);
  raiz = createRoot(caixa);
});

afterEach(() => {
  act(() => raiz.unmount());
  caixa.remove();
  document.body.querySelectorAll('[role="dialog"]').forEach((el) => el.remove());
  vi.clearAllMocks();
});

describe('PurchasingScreen — Form Grammar sem mudar regra', () => {
  it('todo controle visível tem rótulo real (nada de placeholder como rótulo)', async () => {
    await montar([pedido({})]);
    await abrir();
    await abrirNovoPedido();
    const controles = [
      ...document.body.querySelectorAll('input, select, textarea'),
    ] as HTMLInputElement[];
    expect(controles.length).toBeGreaterThan(4);
    for (const c of controles)
      expect(c.labels?.length || c.getAttribute('aria-label')).toBeTruthy();
  });

  it('criar pedido vazio mostra o erro junto da ação e não chama a API', async () => {
    await montar([]);
    await abrirNovoPedido();
    await act(async () => botao('Criar pedido')?.click());
    expect(api.createPurchaseOrder).not.toHaveBeenCalled();
    const alerta = dialogo()!.querySelector('[role="alert"]');
    expect(alerta?.textContent).toBe('Informe ao menos um produto com quantidade');
  });

  it('criar pedido envia exatamente o mesmo payload de antes', async () => {
    vi.mocked(api.createPurchaseOrder).mockResolvedValue(pedido({}));
    await montar([]);
    await abrirNovoPedido();
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

  it('Fase 7.3 — "Novo pedido" abre em Dialogo, Escape fecha e devolve o foco ao botão', async () => {
    await montar([]);
    const gatilho = botao('Novo pedido')!;
    gatilho.focus();
    act(() => gatilho.dispatchEvent(new MouseEvent('click', { bubbles: true })));
    expect(dialogo()).not.toBeNull();
    await act(async () => {
      document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
    });
    expect(dialogo()).toBeNull();
    expect(document.activeElement).toBe(gatilho);
  });

  it('Fase 7.3 — criar pedido com sucesso fecha o Dialogo e atualiza a lista', async () => {
    vi.mocked(api.createPurchaseOrder).mockResolvedValue(pedido({}));
    vi.mocked(api.listPurchaseOrders).mockResolvedValue([]);
    await montar([]);
    await abrirNovoPedido();
    act(() => {
      digitar(porRotulo('Produto do item 1')!, 'PROD-9');
      digitar(porRotulo('Quantidade do item 1')!, '5');
    });
    vi.mocked(api.listPurchaseOrders).mockResolvedValue([pedido({})]);
    await act(async () => botao('Criar pedido')?.click());
    expect(dialogo()).toBeNull();
    expect(api.listPurchaseOrders).toHaveBeenCalledTimes(2);
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

describe('PurchasingScreen — Fase 7.3, itens e recebimento numa tabela só', () => {
  it('pedido aprovado com item pendente mostra os campos de recebimento na própria linha do item', async () => {
    await montar([
      pedido({
        status: 'APROVADO',
        supplierId: 'FORN-A',
        items: [
          { productId: 'PROD-1', quantityOrdered: 10, unitCostCentavos: 500, quantityReceived: 0 },
        ],
      }),
    ]);
    await abrir();
    // uma tabela só — não existe mais a lista separada "Conferência manual"
    // repetindo os mesmos produtos.
    expect(caixa.querySelectorAll('table').length).toBe(1);
    expect(porRotulo('Quantidade recebida de PROD-1')).not.toBeUndefined();
    expect(porRotulo('Custo unitário de PROD-1, em reais')).not.toBeUndefined();
  });

  it('item já completo não ganha campo de recebimento, mostra "Completo"', async () => {
    await montar([
      pedido({
        status: 'RECEBIDO_PARCIAL',
        supplierId: 'FORN-A',
        items: [
          { productId: 'PROD-1', quantityOrdered: 10, unitCostCentavos: 500, quantityReceived: 10 },
          { productId: 'PROD-2', quantityOrdered: 4, unitCostCentavos: 300, quantityReceived: 1 },
        ],
      }),
    ]);
    await abrir();
    expect(porRotulo('Quantidade recebida de PROD-1')).toBeUndefined();
    expect(porRotulo('Quantidade recebida de PROD-2')).not.toBeUndefined();
    expect(caixa.textContent).toContain('Completo');
  });

  it('aba XML não mostra campos de quantidade/custo na tabela (só a leitura)', async () => {
    await montar([pedido({ status: 'APROVADO', supplierId: 'FORN-A' })]);
    await abrir();
    await act(async () => botao('Entrada por XML (DF-e)')?.click());
    expect(porRotulo('Quantidade recebida de PROD-1')).toBeUndefined();
    expect(caixa.textContent).not.toContain('Qtd. recebida');
  });

  it('pedido recebido por completo mostra mensagem de fechamento, sem seção de recebimento', async () => {
    await montar([
      pedido({
        status: 'RECEBIDO',
        supplierId: 'FORN-A',
        items: [
          { productId: 'PROD-1', quantityOrdered: 10, unitCostCentavos: 500, quantityReceived: 10 },
        ],
      }),
    ]);
    await abrir();
    expect(caixa.querySelector('[role="status"]')?.textContent).toBe(
      'Recebido por completo — nada pendente neste pedido.',
    );
    expect(caixa.textContent).not.toContain('Confirmar recebimento');
  });
});

describe('PurchasingScreen — Fase 7.3, falha ao carregar pedidos não vira "nenhum pedido" silencioso', () => {
  it('erro na API mostra alerta visível, distinto de filial sem pedidos', async () => {
    vi.mocked(api.listPurchaseOrders).mockRejectedValue(new Error('Falha ao carregar pedidos'));
    await act(async () => raiz.render(<PurchasingScreen />));
    await act(async () => {});
    expect(caixa.querySelector('[role="alert"]')?.textContent).toBe('Falha ao carregar pedidos');
    expect(caixa.textContent).not.toContain('Nenhum pedido para esta filial.');
  });

  it('depois do erro, "Atualizar" com sucesso substitui o alerta pela lista', async () => {
    vi.mocked(api.listPurchaseOrders).mockRejectedValueOnce(new Error('Falha ao carregar pedidos'));
    await act(async () => raiz.render(<PurchasingScreen />));
    await act(async () => {});
    expect(caixa.querySelector('[role="alert"]')).not.toBeNull();

    vi.mocked(api.listPurchaseOrders).mockResolvedValue([pedido({})]);
    await act(async () => botao('Atualizar')?.click());
    expect(caixa.querySelector('[role="alert"]')).toBeNull();
    expect(caixa.querySelectorAll('[data-pedido]').length).toBe(1);
  });
});
