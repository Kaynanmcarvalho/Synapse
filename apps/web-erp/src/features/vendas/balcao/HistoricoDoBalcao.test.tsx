import type { PedidoDeVenda } from '@synapse/types';
import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

/** Fase 5.1, piloto 4: o histórico do balcão migrou para a fundação de
 *  DataGrid dentro de um Modal do `@synapse/ui` — a tabela muda, o Modal e a
 *  API não. Estes testes travam o que a tela já fazia (situação sem cor
 *  crua, duas ações por linha, filtro server-side). */

const api = vi.hoisted(() => ({ historicoDoBalcao: vi.fn() }));
vi.mock('../comum/vendas.api', () => api);

import { HistoricoDoBalcao } from './HistoricoDoBalcao';

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

let raiz: Root;
let caixa: HTMLDivElement;
const montar = (conteudo: React.ReactNode) => act(() => raiz.render(conteudo));
const flush = () =>
  act(async () => {
    await Promise.resolve();
  });

beforeEach(() => {
  caixa = document.createElement('div');
  document.body.appendChild(caixa);
  raiz = createRoot(caixa);
  api.historicoDoBalcao.mockReset();
});

afterEach(() => {
  act(() => raiz.unmount());
  caixa.remove();
});

const PEDIDO = {
  id: 'p1',
  numero: 1042,
  tipo: 'VENDA',
  situacao: 'APROVADO',
  vendedorNome: 'Renier',
  vendedorCodigo: 15,
  clienteNome: 'Padaria Estrela',
  totalCentavos: 12_345,
  enviadoEm: new Date('2026-09-20T10:00:00-03:00').toISOString(),
} as unknown as PedidoDeVenda;

describe('HistoricoDoBalcao', () => {
  it('mostra o pedido com situação via Status (sem cor crua) e o valor com "R$" separado', async () => {
    api.historicoDoBalcao.mockResolvedValue([PEDIDO]);
    montar(
      <HistoricoDoBalcao
        vendedorId="v1"
        aoImprimir={vi.fn()}
        aoCopiar={vi.fn()}
        aoFechar={vi.fn()}
      />,
    );
    await flush();
    expect(caixa.textContent).toContain('Padaria Estrela');
    expect(caixa.textContent).toContain('Aprovado');
    expect(caixa.textContent).toContain('R$');
    expect(caixa.innerHTML).not.toMatch(/#[0-9a-f]{3,6}/i);
  });

  it('Imprimir e Copiar chamam os callbacks com o pedido certo', async () => {
    api.historicoDoBalcao.mockResolvedValue([PEDIDO]);
    const aoImprimir = vi.fn();
    const aoCopiar = vi.fn();
    montar(
      <HistoricoDoBalcao
        vendedorId="v1"
        aoImprimir={aoImprimir}
        aoCopiar={aoCopiar}
        aoFechar={vi.fn()}
      />,
    );
    await flush();

    const botoes = [...caixa.querySelectorAll('button')];
    const imprimir = botoes.find((b) => b.textContent?.includes('Imprimir'));
    const copiar = botoes.find((b) => b.textContent?.includes('Copiar itens'));

    act(() => imprimir?.dispatchEvent(new MouseEvent('click', { bubbles: true })));
    expect(aoImprimir).toHaveBeenCalledWith(PEDIDO);

    act(() => copiar?.dispatchEvent(new MouseEvent('click', { bubbles: true })));
    expect(aoCopiar).toHaveBeenCalledWith(PEDIDO);
  });

  it('trocar o período refaz a busca com o novo recorte de dias', async () => {
    api.historicoDoBalcao.mockResolvedValue([]);
    montar(
      <HistoricoDoBalcao
        vendedorId="v1"
        aoImprimir={vi.fn()}
        aoCopiar={vi.fn()}
        aoFechar={vi.fn()}
      />,
    );
    await flush();
    expect(api.historicoDoBalcao).toHaveBeenCalledWith(
      expect.objectContaining({ funcionarioId: null }),
    );

    const botao7dias = [...caixa.querySelectorAll('button')].find((b) =>
      b.textContent?.includes('Últimos 7 dias'),
    );
    act(() => botao7dias?.dispatchEvent(new MouseEvent('click', { bubbles: true })));
    await flush();
    expect(api.historicoDoBalcao).toHaveBeenCalledTimes(2);
  });

  it('sem pedidos, mostra a mensagem de período vazio', async () => {
    api.historicoDoBalcao.mockResolvedValue([]);
    montar(
      <HistoricoDoBalcao
        vendedorId="v1"
        aoImprimir={vi.fn()}
        aoCopiar={vi.fn()}
        aoFechar={vi.fn()}
      />,
    );
    await flush();
    expect(caixa.textContent).toContain('Nenhum pedido no período.');
  });
});
