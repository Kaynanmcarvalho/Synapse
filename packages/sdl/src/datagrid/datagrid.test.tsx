import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { classesDaLinha } from './estados';
import { SynapseSignal } from './linha';
import { DataGridCelula } from './celula';
import { DataGridCabecalho } from './cabecalho';
import { proximaOrdenacao } from './ordenacao';

/** A fundação de DataGrid (Fase 5) implementa a Data Row v1 já congelada —
 *  estes testes travam o contrato (papel, estado de linha, ordenação), não
 *  reimplementam os testes de comportamento das telas que a consomem. */

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

describe('classesDaLinha', () => {
  it('selecionada usa plano, nunca o mesmo tratamento do hover-sem-seleção', () => {
    expect(classesDaLinha({ selecionada: true })).toContain('bg-surface-hover');
    expect(classesDaLinha({ selecionada: true })).not.toContain('hover:bg-surface-hover');
    expect(classesDaLinha({ selecionada: false })).toContain('hover:bg-surface-hover');
  });

  it('foco-com-anel e foco-via-plano são tratamentos mutuamente exclusivos', () => {
    expect(classesDaLinha({ focoComAnel: true })).toContain('focus-visible:ring-1');
    expect(classesDaLinha({ focoComAnel: false })).not.toContain('focus-visible:ring-1');
    expect(classesDaLinha({ focoComAnel: false })).toContain('focus-visible:bg-surface-hover');
  });

  it('hairlineNaLinha controla se a própria linha desenha a borda', () => {
    expect(classesDaLinha({ hairlineNaLinha: true })).toContain('border-b');
    expect(classesDaLinha({ hairlineNaLinha: false })).not.toContain('border-b');
  });
});

describe('SynapseSignal', () => {
  it('gatilho controlado só aparece quando ativo', () => {
    montar(<SynapseSignal gatilho="controlado" ativo={false} />);
    expect(caixa.querySelector('span')).toBeNull();

    montar(<SynapseSignal gatilho="controlado" ativo />);
    expect(caixa.querySelector('span')).not.toBeNull();
  });

  it('gatilho foco-do-grupo sempre renderiza, escondido por CSS até o foco', () => {
    montar(<SynapseSignal gatilho="foco-do-grupo" />);
    const span = caixa.querySelector('span');
    expect(span).not.toBeNull();
    expect(span?.className).toContain('group-focus-visible:opacity-100');
  });
});

describe('DataGridCelula', () => {
  it('papel "data" liga font-data; outros papéis não', () => {
    montar(
      <table>
        <tbody>
          <tr>
            <DataGridCelula papel="data">123</DataGridCelula>
            <DataGridCelula papel="primary">Nome</DataGridCelula>
          </tr>
        </tbody>
      </table>,
    );
    const celulas = caixa.querySelectorAll('td');
    expect(celulas[0]?.className).toContain('font-data');
    expect(celulas[1]?.className).not.toContain('font-data');
  });

  it('comHairline desenha a borda só quando pedido', () => {
    montar(
      <table>
        <tbody>
          <tr>
            <DataGridCelula comHairline>A</DataGridCelula>
          </tr>
        </tbody>
      </table>,
    );
    expect(caixa.querySelector('td')?.className).toContain('border-b');
  });

  it('truncar=false preserva quebra de linha natural (tabelas de largura livre)', () => {
    montar(
      <table>
        <tbody>
          <tr>
            <DataGridCelula truncar={false}>A</DataGridCelula>
          </tr>
        </tbody>
      </table>,
    );
    const classe = caixa.querySelector('td')?.className ?? '';
    expect(classe).not.toContain('whitespace-nowrap');
    expect(classe).not.toContain('truncate');
  });
});

describe('DataGridCabecalho', () => {
  it('ordenável mas não é a coluna ativa anuncia aria-sort="none"', () => {
    montar(
      <table>
        <thead>
          <tr>
            <DataGridCabecalho
              id="cidade"
              rotulo="Cidade"
              ordenacao={{ coluna: 'nome', direcao: 'asc' }}
              aoOrdenar={() => {}}
            />
          </tr>
        </thead>
      </table>,
    );
    expect(caixa.querySelector('th')?.getAttribute('aria-sort')).toBe('none');
  });

  it('sem aoOrdenar, é só texto, sem aria-sort', () => {
    montar(
      <table>
        <thead>
          <tr>
            <DataGridCabecalho id="nome" rotulo="Cliente" />
          </tr>
        </thead>
      </table>,
    );
    const th = caixa.querySelector('th');
    expect(th?.querySelector('button')).toBeNull();
    expect(th?.getAttribute('aria-sort')).toBeNull();
  });

  it('com aoOrdenar, vira botão e anuncia a direção via aria-sort', () => {
    montar(
      <table>
        <thead>
          <tr>
            <DataGridCabecalho
              id="nome"
              rotulo="Cliente"
              ordenacao={{ coluna: 'nome', direcao: 'asc' }}
              aoOrdenar={() => {}}
            />
          </tr>
        </thead>
      </table>,
    );
    const th = caixa.querySelector('th');
    expect(th?.querySelector('button')).not.toBeNull();
    expect(th?.getAttribute('aria-sort')).toBe('ascending');
  });
});

describe('proximaOrdenacao', () => {
  it('primeira ordenação da coluna começa crescente', () => {
    expect(proximaOrdenacao(null, 'nome')).toEqual({ coluna: 'nome', direcao: 'asc' });
  });

  it('segundo clique na mesma coluna inverte', () => {
    expect(proximaOrdenacao({ coluna: 'nome', direcao: 'asc' }, 'nome')).toEqual({
      coluna: 'nome',
      direcao: 'desc',
    });
  });

  it('clicar em outra coluna recomeça crescente', () => {
    expect(proximaOrdenacao({ coluna: 'nome', direcao: 'desc' }, 'cidade')).toEqual({
      coluna: 'cidade',
      direcao: 'asc',
    });
  });
});
