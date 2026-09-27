import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

/** Fase 5.4 — a aba de pedidos do vendedor migra para a fundação de
 *  DataGrid; a situação (mesmo domínio de HistoricoDoBalcao) passa a usar
 *  Status em vez do texto cru mapeado por um dicionário local sem cor. */

const api = vi.hoisted(() => ({
  pedidosDoFuncionario: vi.fn(),
  resumoDoFuncionario: vi.fn(),
}));
vi.mock('../funcionarios.api', () => api);

import { AbaDocumentos } from './AbaDocumentosERelatorios';

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

describe('AbaDocumentos (funcionário)', () => {
  it('mostra a situação via Status, sem cor solta em hexadecimal', async () => {
    api.pedidosDoFuncionario.mockResolvedValue([
      {
        id: 'p1',
        numero: 42,
        clienteNome: 'Mercado Bom Preço',
        situacao: 'FATURADO',
        tipo: 'PDV',
        totalCentavos: 12_345,
        enviadoEm: '2026-09-01T10:00:00.000Z',
      },
    ]);
    act(() => raiz.render(<AbaDocumentos funcionarioId="f1" />));
    await esperar();

    expect(caixa.textContent).toContain('Faturado');
    expect(caixa.textContent).toContain('Mercado Bom Preço');
    expect(caixa.innerHTML).not.toMatch(/#[0-9a-f]{3,6}/i);
  });
});
