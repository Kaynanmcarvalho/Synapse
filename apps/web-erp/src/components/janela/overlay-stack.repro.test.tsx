import { Modal } from '@synapse/ui';
import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { Janela } from './Janela';
import { type Area } from './geometria';

/** Fase 6.3 (§1-2) — mesma investigacao de overlay-stack.repro.test.tsx
 *  (features/credit/ui), agora para o par Janela (bolha, sem pilha) + Modal
 *  do SDL (captura, com pilha propria via useOverlay). Caso real:
 *  `BuscaDeMunicipio` (Modal) aberta dentro do Cadastro de Cliente (Janela
 *  com `comFundo`, sempre `ativa`). */

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

let raiz: Root;
let caixa: HTMLDivElement;

const ABERTURA = (_area: Area) => ({ x: 100, y: 100, largura: 600, altura: 400 });

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

const pressionarEscape = () => {
  const alvo = document.activeElement ?? document.body;
  act(() => {
    alvo.dispatchEvent(
      new KeyboardEvent('keydown', { key: 'Escape', bubbles: true, cancelable: true }),
    );
  });
};

describe('Overlay stack — Janela (bolha) + Modal do SDL (captura) empilhados', () => {
  it('Escape com um Modal aberto sobre a Janela ativa NAO deve tambem fechar a Janela', () => {
    const aoFecharJanela = vi.fn();
    const aoFecharModal = vi.fn();

    // A Janela abre primeiro (a tela de cadastro), como sempre acontece de
    // verdade — o lookup so entra depois, quando a pessoa clica na lupa.
    // Montar os dois no MESMO commit inverteria a ordem de registro na
    // pilha (React roda efeito de filho antes do pai) e mascararia o caso
    // real, onde a Janela ja esta montada havia tempo quando o Modal abre.
    act(() =>
      raiz.render(
        <Janela
          id="teste-janela-modal"
          titulo="Cadastro"
          abertura={ABERTURA}
          zIndex={100}
          ativa
          comFundo
          aoFechar={aoFecharJanela}
          aoFocar={vi.fn()}
        >
          <button type="button">Dentro da janela</button>
        </Janela>,
      ),
    );

    act(() =>
      raiz.render(
        <Janela
          id="teste-janela-modal"
          titulo="Cadastro"
          abertura={ABERTURA}
          zIndex={100}
          ativa
          comFundo
          aoFechar={aoFecharJanela}
          aoFocar={vi.fn()}
        >
          <button type="button">Dentro da janela</button>
          <Modal onClose={aoFecharModal} title="Buscar cidade" size="md">
            <button type="button">Item da lista</button>
          </Modal>
        </Janela>,
      ),
    );

    const item = [...document.querySelectorAll('button')].find(
      (b) => b.textContent === 'Item da lista',
    ) as HTMLButtonElement;
    item.focus();
    expect(document.activeElement).toBe(item);

    pressionarEscape();

    expect(aoFecharJanela).not.toHaveBeenCalled();
  });
});
