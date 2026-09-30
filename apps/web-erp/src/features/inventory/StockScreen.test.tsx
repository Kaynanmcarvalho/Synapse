import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { ExpiringLot } from './stock.api';

/** Fase 7 — redesign de tela (header, indicadores, ferramentas de
 *  localização) sobre a StockScreen. Estes testes travam o que a fase
 *  PROÍBE mudar (payload de createLot/moveStock, regra de exibição dos
 *  alertas) e o que ela adicionou de verdade: busca e filtro por nível são
 *  só client-side sobre o que a API já devolveu (nenhum parâmetro novo em
 *  `listExpiryAlerts`), e a falha na leitura dos alertas agora aparece como
 *  erro visível em vez de virar "0 lotes" silencioso. */

const dev = vi.hoisted(() => ({ devSignIn: vi.fn(), isSignedIn: vi.fn(() => true) }));
vi.mock('../../lib/dev-auth', () => dev);

const api = vi.hoisted(() => ({
  listExpiryAlerts: vi.fn(),
  createLot: vi.fn(),
  getLotBalance: vi.fn(),
  moveStock: vi.fn(),
}));
vi.mock('./stock.api', () => api);

import { StockScreen } from './StockScreen';

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

let raiz: Root;
let caixa: HTMLDivElement;
const montar = (conteudo: React.ReactNode) => act(() => raiz.render(conteudo));
const esperar = async () => {
  await act(async () => {
    await new Promise((resolver) => setTimeout(resolver, 0));
  });
};

const ALERTA = (parcial: Partial<ExpiringLot> = {}): ExpiringLot => ({
  daysUntilExpiry: 12,
  alertLevel: 'D15',
  ...parcial,
  lot: {
    id: 'lote-1',
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

const TRES_NIVEIS = [
  ALERTA({ alertLevel: 'D90', lot: { id: 'l1', productId: 'Leite integral 1L' } as never }),
  ALERTA({ alertLevel: 'D15', lot: { id: 'l2', productId: 'Queijo minas 500g' } as never }),
  ALERTA({
    alertLevel: 'EXPIRED',
    daysUntilExpiry: -3,
    lot: { id: 'l3', productId: 'Pão de forma' } as never,
  }),
];

beforeEach(() => {
  caixa = document.createElement('div');
  document.body.appendChild(caixa);
  raiz = createRoot(caixa);
  dev.isSignedIn.mockReturnValue(true);
  api.listExpiryAlerts.mockReset().mockResolvedValue(TRES_NIVEIS);
  api.createLot.mockReset();
  api.moveStock.mockReset();
});

afterEach(() => {
  act(() => raiz.unmount());
  caixa.remove();
  document.body.querySelectorAll('[role="dialog"]').forEach((el) => el.remove());
});

const botao = (texto: string | RegExp) =>
  [...caixa.querySelectorAll('button')].find((b) =>
    typeof texto === 'string' ? b.textContent?.trim() === texto : texto.test(b.textContent ?? ''),
  );

/** jsdom não dispara o onChange do React quando o `.value` é setado
 *  diretamente — precisa do setter nativo do protótipo, o mesmo truque já
 *  usado em JanelaDoCliente.test.tsx (`digitar`). */
const digitar = (elemento: HTMLInputElement | HTMLTextAreaElement, valor: string) => {
  const prototipo =
    elemento instanceof HTMLTextAreaElement
      ? HTMLTextAreaElement.prototype
      : HTMLInputElement.prototype;
  const definir = Object.getOwnPropertyDescriptor(prototipo, 'value')?.set;
  act(() => {
    definir?.call(elemento, valor);
    elemento.dispatchEvent(new Event('input', { bubbles: true }));
  });
};

describe('StockScreen — ferramentas de localização (Fase 7, client-side)', () => {
  it('busca filtra a tabela sem chamar a API de novo', async () => {
    montar(<StockScreen />);
    await esperar();
    expect(caixa.querySelectorAll('tbody tr').length).toBe(3);
    expect(api.listExpiryAlerts).toHaveBeenCalledTimes(1);

    const campo = caixa.querySelector<HTMLInputElement>('input[aria-label="Localizar lote"]');
    digitar(campo!, 'queijo');
    await esperar();

    expect(caixa.querySelectorAll('tbody tr').length).toBe(1);
    expect(caixa.textContent).toContain('Queijo minas 500g');
    expect(api.listExpiryAlerts).toHaveBeenCalledTimes(1); // nenhum novo fetch
  });

  it('pílula de nível filtra e "Limpar" restaura tudo', async () => {
    montar(<StockScreen />);
    await esperar();

    act(() => botao(/^Vencido/)?.click());
    await esperar();
    expect(caixa.querySelectorAll('tbody tr').length).toBe(1);
    expect(caixa.textContent).toContain('Pão de forma');

    act(() => botao('Limpar')?.click());
    await esperar();
    expect(caixa.querySelectorAll('tbody tr').length).toBe(3);
  });

  it('Fase 7.1 §1-C — busca sem correspondência mostra mensagem distinta do "sem lotes"', async () => {
    montar(<StockScreen />);
    await esperar();

    const campo = caixa.querySelector<HTMLInputElement>('input[aria-label="Localizar lote"]');
    digitar(campo!, 'produto-que-nao-existe');
    await esperar();

    expect(caixa.querySelectorAll('tbody tr').length).toBe(0);
    expect(caixa.textContent).toContain('Nenhum lote corresponde à busca ou ao filtro atual');
    expect(caixa.textContent).not.toContain('Nenhum lote dentro da janela de alerta');
  });

  it('indicadores mostram o universo total, não o filtrado pela busca', async () => {
    montar(<StockScreen />);
    await esperar();
    const campo = caixa.querySelector<HTMLInputElement>('input[aria-label="Localizar lote"]');
    digitar(campo!, 'queijo');
    await esperar();
    // "Lotes monitorados" continua 3, mesmo com a tabela mostrando 1
    expect(caixa.textContent).toMatch(/Lotes monitorados[\s\S]*3/);
  });
});

describe('StockScreen — falha ao carregar alertas (Fase 7, correção herdada)', () => {
  it('mostra erro visível em vez de "0 lotes" silencioso', async () => {
    api.listExpiryAlerts.mockRejectedValue(new Error('Falha ao ler alertas'));
    montar(<StockScreen />);
    await esperar();

    expect(caixa.querySelector('[role="alert"]')?.textContent).toBe('Falha ao ler alertas');
    expect(caixa.querySelector('table')).toBeNull();
  });
});

describe('StockScreen — overlays e payload preservados', () => {
  it('"Novo lote" abre o Modal e cadastrar envia o payload de sempre', async () => {
    api.createLot.mockResolvedValue({});
    montar(<StockScreen />);
    await esperar();

    act(() => botao(/Novo lote/)?.click());
    await esperar();

    const dialogo = document.body.querySelector('[role="dialog"]')!;
    const inputs = dialogo.querySelectorAll('input');
    const idProduto = inputs[2] as HTMLInputElement;
    const quantidade = [...inputs].find((i) => i.type === 'number') as HTMLInputElement;
    digitar(idProduto, 'produto-x');
    digitar(quantidade, '10');
    await esperar();

    const cadastrar = [...document.body.querySelectorAll('button')].find(
      (b) => b.textContent?.trim() === 'Cadastrar lote',
    );
    act(() => cadastrar?.dispatchEvent(new MouseEvent('click', { bubbles: true })));
    await esperar();

    expect(api.createLot).toHaveBeenCalledWith(
      expect.objectContaining({
        branchId: 'matriz',
        warehouseId: 'deposito-1',
        productId: 'produto-x',
        quantity: 10,
      }),
    );
  });

  it('"Ajuste rápido" abre o Drawer com Entrada/Saída/Ajuste e envia o payload de sempre', async () => {
    api.moveStock.mockResolvedValue({});
    montar(<StockScreen />);
    await esperar();

    act(() => botao(/Ajuste rápido/)?.click());
    await esperar();

    const dialogo = document.body.querySelector('[role="dialog"]');
    expect(dialogo?.textContent).toMatch(/Entrada/);
    expect(dialogo?.textContent).toMatch(/Saída/);
    expect(dialogo?.textContent).toMatch(/Ajuste/);

    const inputs = dialogo!.querySelectorAll('input');
    const idProduto = inputs[2] as HTMLInputElement;
    const quantidade = [...inputs].find((i) => i.type === 'number') as HTMLInputElement;
    const motivo = dialogo!.querySelector('textarea') as HTMLTextAreaElement;
    digitar(idProduto, 'produto-y');
    digitar(quantidade, '5');
    digitar(motivo, 'contagem cega');
    await esperar();

    const confirmar = [...document.body.querySelectorAll('button')].find(
      (b) => b.textContent?.trim() === 'Confirmar movimento',
    );
    act(() => confirmar?.dispatchEvent(new MouseEvent('click', { bubbles: true })));
    await esperar();

    expect(api.moveStock).toHaveBeenCalledWith(
      'ADJUSTMENT',
      expect.objectContaining({
        branchId: 'matriz',
        warehouseId: 'deposito-1',
        productId: 'produto-y',
        quantity: 5,
        reason: 'contagem cega',
        allowNegative: false,
      }),
    );
  });
});
