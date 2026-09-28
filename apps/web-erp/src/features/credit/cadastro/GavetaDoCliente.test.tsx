import type { SituacaoDeCredito } from '@synapse/types';
import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { GavetaDoCliente } from './GavetaDoCliente';

/** Fase 6.2 (§32-33) — mesmo débito de foco do `Dialogo`: a gaveta focava o
 *  próprio painel na abertura, mas nunca prendia o Tab nem devolvia o foco a
 *  quem abriu ao fechar. */

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

let raiz: Root;
let caixa: HTMLDivElement;

const situacao = {} as SituacaoDeCredito;

beforeEach(() => {
  caixa = document.createElement('div');
  document.body.appendChild(caixa);
  raiz = createRoot(caixa);
});

afterEach(() => {
  act(() => raiz.unmount());
  caixa.remove();
});

describe('GavetaDoCliente — foco', () => {
  it('Tab no botão "Abrir cadastro completo" (último) volta ao botão "Fechar" (primeiro)', () => {
    act(() =>
      raiz.render(
        <GavetaDoCliente
          nome="Mercado do Bairro"
          cadastro={null}
          situacao={situacao}
          aoAbrirCompleto={vi.fn()}
          aoFechar={vi.fn()}
        />,
      ),
    );
    const painel = document.querySelector('aside') as HTMLElement;
    const botoes = [...painel.querySelectorAll('button')];
    const primeiro = botoes[0] as HTMLButtonElement;
    const ultimo = botoes[botoes.length - 1] as HTMLButtonElement;

    ultimo.focus();
    expect(document.activeElement).toBe(ultimo);
    act(() => {
      const evento = new KeyboardEvent('keydown', { key: 'Tab', bubbles: true, cancelable: true });
      document.dispatchEvent(evento);
    });
    expect(document.activeElement).toBe(primeiro);
  });

  it('ao desmontar, devolve o foco para quem abriu a gaveta', () => {
    const botaoDeFora = document.createElement('button');
    document.body.appendChild(botaoDeFora);
    botaoDeFora.focus();

    act(() =>
      raiz.render(
        <GavetaDoCliente
          nome="Mercado do Bairro"
          cadastro={null}
          situacao={situacao}
          aoAbrirCompleto={vi.fn()}
          aoFechar={vi.fn()}
        />,
      ),
    );
    act(() => raiz.unmount());
    expect(document.activeElement).toBe(botaoDeFora);
    botaoDeFora.remove();
  });
});
