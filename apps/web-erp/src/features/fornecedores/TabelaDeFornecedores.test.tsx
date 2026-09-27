import type { FornecedorNaLista } from '@synapse/types';
import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { TabelaDeFornecedores } from './TabelaDeFornecedores';

/** Fase 5.2: a lista de Fornecedores migrou para a fundação de DataGrid com
 *  a mesma paridade de Clientes. */

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

const BASE: FornecedorNaLista = {
  id: 'v1',
  codigo: 42,
  razaoSocial: 'Distribuidora ABC LTDA',
  nomeFantasia: 'ABC Distribuidora',
  documento: '12345678000199',
  tipoDePessoa: 'JURIDICA',
  cidade: 'Goiânia',
  uf: 'GO',
  telefone: '62988887777',
  grupo: 'Bebidas',
  ativo: true,
  atualizadoEm: null,
};

describe('TabelaDeFornecedores', () => {
  it('clicar na linha chama aoAbrir com o id certo', () => {
    const aoAbrir = vi.fn();
    montar(<TabelaDeFornecedores itens={[BASE]} aoAbrir={aoAbrir} />);
    act(() =>
      caixa.querySelector('tbody tr')?.dispatchEvent(new MouseEvent('click', { bubbles: true })),
    );
    expect(aoAbrir).toHaveBeenCalledWith('v1');
  });

  it('mostra razão social só quando diferente do nome fantasia', () => {
    montar(
      <TabelaDeFornecedores
        itens={[{ ...BASE, razaoSocial: BASE.nomeFantasia }]}
        aoAbrir={vi.fn()}
      />,
    );
    expect(caixa.textContent?.match(/ABC Distribuidora/g)?.length).toBe(1);
  });

  it('situação usa Status sem cor solta (inativo em tom neutro)', () => {
    montar(<TabelaDeFornecedores itens={[{ ...BASE, ativo: false }]} aoAbrir={vi.fn()} />);
    expect(caixa.textContent).toContain('Inativo');
    expect(caixa.innerHTML).not.toMatch(/#[0-9a-f]{3,6}/i);
  });
});
