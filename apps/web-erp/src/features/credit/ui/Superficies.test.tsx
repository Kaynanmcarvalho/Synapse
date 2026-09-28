import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { Dialogo } from './Superficies';

/** Fase 6.2 (§32-33) — débito documentado na Fase 6: `Dialogo` prendia o foco
 *  em nada (Tab escapava para trás do fundo) e não devolvia o foco a quem
 *  abriu ao fechar. Estes testes travam a correção — mesma mecânica já
 *  provada em `Janela.test.tsx`. */

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

let raiz: Root;
let caixa: HTMLDivElement;

beforeEach(() => {
  caixa = document.createElement('div');
  document.body.appendChild(caixa);
  raiz = createRoot(caixa);
});

afterEach(() => {
  act(() => raiz.unmount());
  caixa.remove();
  document.body.querySelectorAll('[role="dialog"]').forEach((el) => el.remove());
});

describe('Dialogo — foco', () => {
  it('Tab no último elemento focável volta ao primeiro, sem escapar do diálogo', () => {
    act(() =>
      raiz.render(
        <Dialogo rotulo="Teste" aoFechar={vi.fn()}>
          <button type="button">Cancelar</button>
          <button type="button">Confirmar</button>
        </Dialogo>,
      ),
    );
    const dialogo = document.querySelector('[role="dialog"]') as HTMLElement;
    const botoes = [...dialogo.querySelectorAll('button')];
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

  it('ao desmontar, devolve o foco para quem abriu', () => {
    const botaoDeFora = document.createElement('button');
    document.body.appendChild(botaoDeFora);
    botaoDeFora.focus();
    expect(document.activeElement).toBe(botaoDeFora);

    act(() =>
      raiz.render(
        <Dialogo rotulo="Teste" aoFechar={vi.fn()}>
          <button type="button">Confirmar</button>
        </Dialogo>,
      ),
    );
    act(() => raiz.unmount());
    expect(document.activeElement).toBe(botaoDeFora);
    botaoDeFora.remove();
  });
});
