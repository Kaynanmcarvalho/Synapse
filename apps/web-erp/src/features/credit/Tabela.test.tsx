import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { BotaoLupa, Celula, LinhaDaTabela, Tabela, type ColunaDaTabela } from './Tabela';

/** Fase 5.4: `Tabela` da ficha de crédito (8 consumidores) passou a compor a
 *  fundação de DataGrid por dentro, sem mudar a API. Estes testes travam o
 *  comportamento que os consumidores dependem: lupa desabilitada sem
 *  documento, largura fixa de coluna, destaque de vencido e cabeçalho sem
 *  caixa-alta decorativa. */

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

const COLUNAS: readonly ColunaDaTabela[] = [
  { rotulo: 'Título' },
  { rotulo: 'Saldo', alinhamento: 'direita' },
  { rotulo: '', alinhamento: 'centro', largura: '48px' },
];

const montarTabela = (aoAbrir: (() => void) | null, destaque = false) =>
  montar(
    <Tabela colunas={COLUNAS} larguraMinima={560}>
      <LinhaDaTabela destaque={destaque}>
        <Celula coluna={COLUNAS[0] ?? { rotulo: '' }} forte>
          000123
        </Celula>
        <Celula coluna={COLUNAS[1] ?? { rotulo: '' }}>R$ 10,00</Celula>
        <Celula coluna={COLUNAS[2] ?? { rotulo: '' }}>
          <BotaoLupa rotulo="Abrir o título 000123" aoAbrir={aoAbrir} />
        </Celula>
      </LinhaDaTabela>
    </Tabela>,
  );

describe('Tabela da ficha de crédito', () => {
  it('a lupa abre o documento quando há um ligado', () => {
    const aoAbrir = vi.fn();
    montarTabela(aoAbrir);
    const lupa = caixa.querySelector<HTMLButtonElement>(
      'button[aria-label="Abrir o título 000123"]',
    );
    expect(lupa?.disabled).toBe(false);
    act(() => lupa?.click());
    expect(aoAbrir).toHaveBeenCalledTimes(1);
  });

  it('sem documento ligado, a lupa fica desabilitada e o título explica', () => {
    montarTabela(null);
    const lupa = caixa.querySelector<HTMLButtonElement>(
      'button[aria-label="Abrir o título 000123"]',
    );
    expect(lupa?.disabled).toBe(true);
    expect(lupa?.title).toBe('Este registro não está ligado a um pedido');
  });

  it('cabeçalho em sentence case, largura fixa preservada e valor à direita com font-data', () => {
    montarTabela(null);
    const titulos = [...caixa.querySelectorAll('th')];
    expect(titulos.map((th) => th.textContent)).toEqual(['Título', 'Saldo', '']);
    expect(titulos.some((th) => th.className.includes('uppercase'))).toBe(false);
    expect(titulos[2]?.style.width).toBe('48px');
    const saldo = caixa.querySelectorAll('td')[1];
    expect(saldo?.className).toContain('text-right');
    expect(saldo?.className).toContain('font-data');
  });

  it('linha vencida mantém o destaque; linha comum não', () => {
    montarTabela(null, true);
    expect(caixa.querySelector('tbody tr')?.className).toContain('bg-accent-danger');
    montarTabela(null, false);
    expect(caixa.querySelector('tbody tr')?.className).not.toContain('bg-accent-danger');
  });
});
