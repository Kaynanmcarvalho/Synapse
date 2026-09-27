import type { FuncionarioNaLista } from '@synapse/types';
import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { TabelaDeFuncionarios } from './TabelaDeFuncionarios';

/** Fase 5.2: a lista de Funcionários migrou para a fundação de DataGrid com
 *  a mesma paridade de Clientes — estes testes travam o que já existia
 *  (row-open, situação com múltiplas etiquetas), não a aparência em si. */

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

const BASE: FuncionarioNaLista = {
  id: 'f1',
  codigo: 15,
  nome: 'Renier Souza',
  matricula: '0015',
  cargo: 'Vendedor',
  departamento: 'Comercial',
  telefone: '62999998888',
  vendedor: true,
  bloqueado: false,
  demitido: false,
  usuarioEmail: null,
  temFoto: false,
};

describe('TabelaDeFuncionarios', () => {
  it('clicar na linha chama aoAbrir com o id certo', () => {
    const aoAbrir = vi.fn();
    montar(<TabelaDeFuncionarios itens={[BASE]} aoAbrir={aoAbrir} />);
    act(() =>
      caixa.querySelector('tbody tr')?.dispatchEvent(new MouseEvent('click', { bubbles: true })),
    );
    expect(aoAbrir).toHaveBeenCalledWith('f1');
  });

  it('Enter na linha focada também abre', () => {
    const aoAbrir = vi.fn();
    montar(<TabelaDeFuncionarios itens={[BASE]} aoAbrir={aoAbrir} />);
    act(() =>
      caixa
        .querySelector('tbody tr')
        ?.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true })),
    );
    expect(aoAbrir).toHaveBeenCalledWith('f1');
  });

  it('empilha vendedor + bloqueado quando os dois são verdadeiros, sem cor solta', () => {
    montar(
      <TabelaDeFuncionarios
        itens={[{ ...BASE, vendedor: true, bloqueado: true }]}
        aoAbrir={vi.fn()}
      />,
    );
    expect(caixa.textContent).toContain('Vendedor');
    expect(caixa.textContent).toContain('Bloqueado');
    expect(caixa.innerHTML).not.toMatch(/#[0-9a-f]{3,6}/i);
  });

  it('sem nenhuma exceção, mostra só "Ativo"', () => {
    montar(
      <TabelaDeFuncionarios
        itens={[{ ...BASE, cargo: 'Analista', vendedor: false, bloqueado: false, demitido: false }]}
        aoAbrir={vi.fn()}
      />,
    );
    expect(caixa.textContent).toContain('Ativo');
    expect(caixa.textContent).not.toContain('Vendedor');
  });
});
