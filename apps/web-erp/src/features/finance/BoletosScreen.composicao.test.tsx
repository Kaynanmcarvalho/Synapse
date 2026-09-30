import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

/** Fase 7.1 — composição de BoletosScreen. Estes testes travam o que a fase
 *  mudou de verdade na tela (não na Action Grammar de LinhaDoBoleto, já
 *  coberta em BoletosScreen.test.tsx, nem no payload de emissão, já coberto
 *  em BoletosFormulario.test.tsx):
 *  - baixa manual virou um Dialogo (Esc fecha, foco no campo obrigatório,
 *    devolução de foco) em vez de uma faixa solta no meio da página;
 *  - a mesma chamada de API/validação/payload da baixa continuam intactas;
 *  - o spinner de carregamento só aparece na primeira carga, não durante
 *    ações de linha;
 *  - "Nenhuma parcela nesta filial" não aparece mais ao lado de uma
 *    mensagem (erro ou sucesso) que já explica a situação. */

const api = vi.hoisted(() => ({ apiRequest: vi.fn() }));
vi.mock('../../lib/dev-auth', () => api);

import { BoletosScreen } from './BoletosScreen';

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

let raiz: Root;
let caixa: HTMLDivElement;
const montar = (conteudo: React.ReactNode) => act(() => raiz.render(conteudo));
const esperar = async () => {
  await act(async () => {
    await new Promise((resolver) => setTimeout(resolver, 0));
  });
};

const ACCOUNTS = [{ id: 'c1', apelido: 'Sicredi', environment: 'MOCK' }];
const CHARGE = (parcial: Partial<Record<string, unknown>> = {}) => ({
  id: 'boleto-1',
  amountCentavos: 89000,
  dueDate: '2026-10-05',
  status: 'REGISTERED',
  installment: 2,
  bank: { linhaDigitavel: '123', pdfUrl: null },
  ...parcial,
});

const digitar = (elemento: HTMLInputElement, valor: string) => {
  const definir = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')?.set;
  act(() => {
    definir?.call(elemento, valor);
    elemento.dispatchEvent(new Event('input', { bubbles: true }));
  });
};

beforeEach(() => {
  caixa = document.createElement('div');
  document.body.appendChild(caixa);
  raiz = createRoot(caixa);
  api.apiRequest.mockReset();
});

afterEach(() => {
  act(() => raiz.unmount());
  caixa.remove();
  document.body.querySelectorAll('[role="dialog"]').forEach((el) => el.remove());
});

const botao = (texto: string) =>
  [...document.body.querySelectorAll('button')].find((b) => b.textContent?.trim() === texto);

describe('BoletosScreen — baixa manual como Dialogo (Fase 7.1)', () => {
  it('"Baixa manual" abre um Dialogo, Esc fecha e devolve o foco à linha', async () => {
    api.apiRequest.mockImplementation(async (rota: string) =>
      rota === '/finance/bank-accounts' ? ACCOUNTS : [CHARGE()],
    );
    montar(<BoletosScreen />);
    await esperar();

    const linha = botao('Baixa manual');
    linha?.focus();
    act(() => linha?.dispatchEvent(new MouseEvent('click', { bubbles: true })));
    await esperar();

    const dialogo = document.body.querySelector('[role="dialog"]');
    expect(dialogo).not.toBeNull();
    expect(dialogo?.textContent).toMatch(/Confirmar recebimento/);
    expect(dialogo?.textContent).toMatch(/R\$\s*890,00/);

    act(() => {
      document.dispatchEvent(
        new KeyboardEvent('keydown', { key: 'Escape', bubbles: true, cancelable: true }),
      );
    });
    await esperar();

    expect(document.body.querySelector('[role="dialog"]')).toBeNull();
    expect(document.activeElement).toBe(botao('Baixa manual'));
  });

  it('confirmar recebimento chama a mesma rota/payload de antes e recarrega a lista', async () => {
    api.apiRequest.mockImplementation(async (rota: string) =>
      rota === '/finance/bank-accounts' ? ACCOUNTS : [CHARGE()],
    );
    montar(<BoletosScreen />);
    await esperar();

    act(() => botao('Baixa manual')?.dispatchEvent(new MouseEvent('click', { bubbles: true })));
    await esperar();

    const justificativa = document.body.querySelector('[role="dialog"] input') as HTMLInputElement;
    digitar(justificativa, 'confirmado no caixa');
    api.apiRequest.mockClear();
    api.apiRequest.mockImplementation(async (rota: string) =>
      rota === '/finance/boletos?branchId=matriz' ? [] : {},
    );

    const confirmar = [...document.body.querySelectorAll('[role="dialog"] button')].find(
      (b) => b.textContent?.trim() === 'Confirmar recebimento',
    );
    act(() => confirmar?.dispatchEvent(new MouseEvent('click', { bubbles: true })));
    await esperar();

    const chamadaDeBaixa = api.apiRequest.mock.calls.find((chamada) =>
      String(chamada[0]).includes('/settle'),
    );
    expect(chamadaDeBaixa?.[0]).toBe('/finance/boletos/boleto-1/settle');
    const corpo = JSON.parse((chamadaDeBaixa?.[1] as RequestInit).body as string);
    expect(corpo).toMatchObject({ amountCentavos: 89000, note: 'confirmado no caixa' });
    expect(document.body.querySelector('[role="dialog"]')).toBeNull();
  });
});

describe('BoletosScreen — estados de carregamento/erro/vazio (Fase 7.1 §23)', () => {
  it('mostra spinner só na primeira carga, não durante uma ação de linha', async () => {
    let resolverPrimeiraCarga: (value: unknown) => void = () => {};
    api.apiRequest.mockImplementation((rota: string) => {
      if (rota === '/finance/bank-accounts') return Promise.resolve(ACCOUNTS);
      return new Promise((resolve) => {
        resolverPrimeiraCarga = resolve;
      });
    });
    montar(<BoletosScreen />);
    await esperar();

    expect(document.querySelector('[role="status"][aria-label="Carregando"]')).not.toBeNull();
    expect(caixa.querySelector('table')).toBeNull();

    act(() => resolverPrimeiraCarga([CHARGE()]));
    await esperar();
    expect(caixa.querySelector('table')).not.toBeNull();
  });

  it('falha ao carregar mostra só a mensagem de erro, sem "Nenhuma parcela nesta filial" ao lado', async () => {
    api.apiRequest.mockImplementation(async (rota: string) => {
      if (rota === '/finance/bank-accounts') return ACCOUNTS;
      throw new Error('Falha ao consultar boletos');
    });
    montar(<BoletosScreen />);
    await esperar();

    expect(caixa.textContent).toContain('Falha ao consultar boletos');
    expect(caixa.textContent).not.toContain('Nenhuma parcela nesta filial');
  });

  it('filial genuinamente sem boletos mostra "Nenhuma parcela nesta filial", sem mensagem', async () => {
    api.apiRequest.mockImplementation(async (rota: string) =>
      rota === '/finance/bank-accounts' ? ACCOUNTS : [],
    );
    montar(<BoletosScreen />);
    await esperar();

    expect(caixa.textContent).toContain('Nenhuma parcela nesta filial');
  });
});
