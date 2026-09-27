import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

/** Fase 6 — piloto 2 da Form Grammar. O formulário mudou de roupa (seções,
 *  Field, controles do SDL); o corpo enviado à API tem de ser idêntico. */

vi.mock('../../lib/dev-auth', () => ({ apiRequest: vi.fn() }));
const { apiRequest } = await import('../../lib/dev-auth');
const { BoletosScreen } = await import('./BoletosScreen');

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

let raiz: Root;
let caixa: HTMLDivElement;

beforeEach(() => {
  caixa = document.createElement('div');
  document.body.appendChild(caixa);
  raiz = createRoot(caixa);
  vi.mocked(apiRequest).mockImplementation(async (rota: string) =>
    rota === '/finance/bank-accounts'
      ? [{ id: 'c1', apelido: 'Sicredi', environment: 'MOCK' }]
      : [],
  );
});

afterEach(() => {
  act(() => raiz.unmount());
  caixa.remove();
  vi.clearAllMocks();
});

const campo = (rotulo: string) =>
  [...caixa.querySelectorAll('label')].find((l) => l.textContent === rotulo)?.control as
    HTMLInputElement | HTMLSelectElement;

const mudar = (el: HTMLInputElement | HTMLSelectElement, valor: string) => {
  const proto = el instanceof HTMLSelectElement ? HTMLSelectElement : HTMLInputElement;
  Object.getOwnPropertyDescriptor(proto.prototype, 'value')?.set?.call(el, valor);
  el.dispatchEvent(
    new Event(el instanceof HTMLSelectElement ? 'change' : 'input', { bubbles: true }),
  );
};

describe('BoletosScreen — formulário de emissão', () => {
  it('todo campo tem rótulo associado e o corpo enviado é o mesmo de antes', async () => {
    await act(async () => raiz.render(<BoletosScreen />));
    const rotulos = [
      'Conta',
      'Filial',
      'Cliente (ID)',
      'Nome do pagador',
      'CPF/CNPJ',
      'Descrição',
      'Total (R$)',
      'Parcelas',
      'Primeiro vencimento',
      'Juros mensal (%)',
      'Multa (%)',
      'Desconto total (R$)',
    ];
    for (const r of rotulos) expect(campo(r), r).toBeTruthy();

    act(() => {
      mudar(campo('Conta'), 'c1');
      mudar(campo('Cliente (ID)'), 'cli-1');
      mudar(campo('Nome do pagador'), 'Fulano');
      mudar(campo('CPF/CNPJ'), '123.456.789-09');
      mudar(campo('Descrição'), 'Venda 42');
      mudar(campo('Total (R$)'), '150.75');
      mudar(campo('Parcelas'), '3');
      mudar(campo('Primeiro vencimento'), '2026-10-10');
      mudar(campo('Desconto total (R$)'), '1.5');
    });
    vi.mocked(apiRequest).mockClear();
    await act(async () => {
      caixa
        .querySelector('form')
        ?.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
    });
    const [rota, init] = vi.mocked(apiRequest).mock.calls[0] ?? [];
    expect(rota).toBe('/finance/boletos');
    const corpo = JSON.parse(String((init as RequestInit).body));
    expect(corpo).toMatchObject({
      accountId: 'c1',
      branchId: 'matriz',
      customerId: 'cli-1',
      description: 'Venda 42',
      totalCentavos: 15075,
      installments: 3,
      firstDueDate: '2026-10-10',
      interestPercent: 0,
      finePercent: 0,
      discountCentavos: 150,
      payer: { nome: 'Fulano', documento: '12345678909' },
    });
    expect(typeof corpo.idempotencyKey).toBe('string');
  });
});
