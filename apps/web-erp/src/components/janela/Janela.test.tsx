import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { Janela } from './Janela';

/** Fase 6.2 — `comFundo` é a única capacidade nova da mecânica de Janela: um
 *  workspace de edição única (o cadastro) precisa bloquear o fundo contra
 *  clique perdido, o que a Fila/Análise/Documentos nunca precisaram. Estes
 *  testes travam: fundo aparece só quando pedido, Tab não escapa com fundo
 *  ligado, Escape continua fechando, e o foco volta a quem abriu. */

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

const ABERTURA = () => ({ x: 100, y: 100, largura: 600, altura: 400 });

describe('Janela — comFundo', () => {
  it('sem comFundo, não desenha bloqueio', () => {
    act(() =>
      raiz.render(
        <Janela
          id="teste-sem-fundo"
          titulo="Teste"
          abertura={ABERTURA}
          zIndex={50}
          ativa
          aoFechar={vi.fn()}
          aoFocar={vi.fn()}
        >
          <button type="button">Dentro</button>
        </Janela>,
      ),
    );
    expect(document.querySelectorAll('[aria-hidden="true"].fixed.inset-0')).toHaveLength(0);
  });

  it('com comFundo, desenha o bloqueio e marca aria-modal', () => {
    act(() =>
      raiz.render(
        <Janela
          id="teste-com-fundo"
          titulo="Teste"
          abertura={ABERTURA}
          zIndex={50}
          ativa
          comFundo
          aoFechar={vi.fn()}
          aoFocar={vi.fn()}
        >
          <button type="button">Dentro</button>
        </Janela>,
      ),
    );
    expect(document.querySelectorAll('[aria-hidden="true"].fixed.inset-0')).toHaveLength(1);
    expect(document.querySelector('[role="dialog"]')?.getAttribute('aria-modal')).toBe('true');
  });

  it('com comFundo, Tab no último elemento focável (o conteúdo) volta ao primeiro (o cabeçalho da janela)', () => {
    act(() =>
      raiz.render(
        <Janela
          id="teste-trap"
          titulo="Teste"
          abertura={ABERTURA}
          zIndex={50}
          ativa
          comFundo
          aoFechar={vi.fn()}
          aoFocar={vi.fn()}
        >
          <button type="button" id="ultimo">
            Último do conteúdo
          </button>
        </Janela>,
      ),
    );
    const dialogo = document.querySelector('[role="dialog"]') as HTMLElement;
    const focaveis = [
      ...dialogo.querySelectorAll<HTMLElement>('button, [tabindex]:not([tabindex="-1"])'),
    ];
    const primeiroDoCabecalho = focaveis[0];
    const ultimo = document.getElementById('ultimo') as HTMLButtonElement;
    expect(focaveis[focaveis.length - 1]).toBe(ultimo);

    ultimo.focus();
    expect(document.activeElement).toBe(ultimo);
    act(() => {
      const evento = new KeyboardEvent('keydown', { key: 'Tab', bubbles: true, cancelable: true });
      document.dispatchEvent(evento);
    });
    expect(document.activeElement).toBe(primeiroDoCabecalho);
  });

  it('Escape fecha mesmo com comFundo', () => {
    const aoFechar = vi.fn();
    act(() =>
      raiz.render(
        <Janela
          id="teste-escape"
          titulo="Teste"
          abertura={ABERTURA}
          zIndex={50}
          ativa
          comFundo
          aoFechar={aoFechar}
          aoFocar={vi.fn()}
        >
          <button type="button">Dentro</button>
        </Janela>,
      ),
    );
    act(() => {
      document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
    });
    expect(aoFechar).toHaveBeenCalled();
  });

  it('ao desmontar, devolve o foco para quem abriu', () => {
    const botaoDeFora = document.createElement('button');
    document.body.appendChild(botaoDeFora);
    botaoDeFora.focus();
    expect(document.activeElement).toBe(botaoDeFora);

    act(() =>
      raiz.render(
        <Janela
          id="teste-foco"
          titulo="Teste"
          abertura={ABERTURA}
          zIndex={50}
          ativa
          comFundo
          aoFechar={vi.fn()}
          aoFocar={vi.fn()}
        >
          <button type="button">Dentro</button>
        </Janela>,
      ),
    );
    act(() => raiz.unmount());
    expect(document.activeElement).toBe(botaoDeFora);
    botaoDeFora.remove();
  });
});
