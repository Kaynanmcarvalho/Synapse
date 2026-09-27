import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

/** Fase 5.4 — a aba de documentos do fornecedor migra para a fundação de
 *  DataGrid; a situação do pedido de compra (mesmo domínio de
 *  PurchasingScreen) passa a usar Status em vez do texto cru. O título a
 *  pagar continua em texto puro — sua situação é livre, sem enum fechado. */

const api = vi.hoisted(() => ({
  documentosDoFornecedor: vi.fn(),
}));
vi.mock('../fornecedores.api', () => api);

import { AbaDocumentos } from './AbaDocumentos';

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

let raiz: Root;
let caixa: HTMLDivElement;

const esperar = async () => {
  await act(async () => {
    await new Promise((resolver) => setTimeout(resolver, 0));
  });
};

beforeEach(() => {
  vi.clearAllMocks();
  caixa = document.createElement('div');
  document.body.appendChild(caixa);
  raiz = createRoot(caixa);
});

afterEach(() => {
  act(() => raiz.unmount());
  caixa.remove();
});

describe('AbaDocumentos (fornecedor)', () => {
  it('mostra pedido de compra com Status e título com valor/saldo formatados, sem cor solta', async () => {
    api.documentosDoFornecedor.mockResolvedValue({
      titulosEmAberto: [
        {
          id: 't1',
          descricao: 'NF 123',
          vencimento: '2026-10-01',
          valorCentavos: 50_000,
          saldoCentavos: 50_000,
          situacao: 'A vencer',
        },
      ],
      titulosPagos: [],
      pedidosDeCompra: [
        {
          id: 'pc1',
          numero: 'PC-1',
          situacao: 'APROVADO',
          totalCentavos: 250_000,
          criadoEm: '2026-09-01T10:00:00.000Z',
        },
      ],
    });
    act(() => raiz.render(<AbaDocumentos fornecedorId="f1" />));
    await esperar();

    expect(caixa.textContent).toContain('Aprovado');
    expect(caixa.textContent).toContain('NF 123');
    expect(caixa.textContent).toContain('A vencer');
    expect(caixa.innerHTML).not.toMatch(/#[0-9a-f]{3,6}/i);
  });
});
