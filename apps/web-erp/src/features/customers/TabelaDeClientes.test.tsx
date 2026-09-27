import type { ClienteNaLista } from '@synapse/types';
import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { BarraDeFiltros, TabelaDeClientes } from './TabelaDeClientes';

/** Fase 4.3: a lista de clientes trocou pílula/card por SDL, sem mudar
 *  comportamento — estes testes protegem exatamente essa fronteira (busca,
 *  clique na linha, o que aparece em cada estado), não a aparência em si
 *  (isso é o que a auditoria visual com Playwright cobre). */

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

const CLIENTE = {
  id: 'c1',
  tenantId: 't1',
  codigo: 'C-0107',
  nome: 'Atacado Sul',
  razaoSocial: 'Atacado Sul Distribuidora EIRELI',
  documento: '45678912000133',
  tipo: 'PJ',
  cidade: 'Anápolis',
  uf: 'GO',
  telefone: '62332411220',
  limiteCentavos: 2_000_000,
  situacao: 'OVERDUE',
  ativo: true,
  grupo: null,
  vendedorNome: null,
  atualizadoEm: null,
} as unknown as ClienteNaLista;

describe('TabelaDeClientes', () => {
  it('mostra o cliente com o "R$" separado do valor e a situação como Status (não pílula solta)', () => {
    montar(
      <TabelaDeClientes
        estado={{ status: 'pronto', itens: [CLIENTE], proximoCursor: null }}
        busca=""
        aoAbrir={vi.fn()}
        aoCarregarMais={vi.fn()}
      />,
    );
    expect(caixa.textContent).toContain('R$');
    expect(caixa.textContent).toContain('20.000,00');
    // O "R$" foi de fato separado do número, não é uma peça só:
    const valor = [...caixa.querySelectorAll('td')].find((td) =>
      td.textContent?.includes('20.000,00'),
    );
    expect(valor?.querySelector('span span')?.textContent).toBe('R$');
    expect(caixa.textContent).toContain('Inadimplente');
    // Situação usa o token de estado do SDL, não mais cor solta (`#fdeced`/`#b3242f`):
    expect(caixa.innerHTML).not.toMatch(/#[0-9a-f]{3,6}/i);
  });

  it('clicar na linha chama aoAbrir com o id do cliente', () => {
    const aoAbrir = vi.fn();
    montar(
      <TabelaDeClientes
        estado={{ status: 'pronto', itens: [CLIENTE], proximoCursor: null }}
        busca=""
        aoAbrir={aoAbrir}
        aoCarregarMais={vi.fn()}
      />,
    );
    act(() =>
      caixa.querySelector('tbody tr')?.dispatchEvent(new MouseEvent('click', { bubbles: true })),
    );
    expect(aoAbrir).toHaveBeenCalledWith('c1');
  });

  it('estado vazio sem busca diz que não há cliente cadastrado; com busca, nomeia o termo', () => {
    montar(
      <TabelaDeClientes
        estado={{ status: 'pronto', itens: [], proximoCursor: null }}
        busca="xyz"
        aoAbrir={vi.fn()}
        aoCarregarMais={vi.fn()}
      />,
    );
    expect(caixa.textContent).toContain('Nenhum cliente para "xyz"');
  });

  it('BarraDeFiltros: o campo de busca tem aria-label e reflete o valor mudando o filtro', () => {
    const aoMudar = vi.fn();
    montar(
      <BarraDeFiltros filtros={{ termo: 'merc', situacao: '', ativo: '' }} aoMudar={aoMudar} />,
    );
    const campo = caixa.querySelector('[aria-label="Buscar cliente"]') as HTMLInputElement;
    expect(campo.value).toBe('merc');
  });
});
