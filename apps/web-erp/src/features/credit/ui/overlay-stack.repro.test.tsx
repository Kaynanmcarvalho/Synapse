import type { SituacaoDeCredito } from '@synapse/types';
import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { GavetaDoCliente } from '../cadastro/GavetaDoCliente';
import { Dialogo } from './Superficies';

/** Fase 6.3 (§1-2) — reproducao do bug suspeitado na Fase 6.2: um Escape
 *  fechando mais de um overlay empilhado.
 *
 *  Caso real: dentro da analise de credito, `aoAbrirCadastro` abre a
 *  `GavetaDoCliente` por cima da janela (`CamadaDoCliente.tsx`), e o mesmo
 *  fluxo tambem abre `DialogoDeDecisao` (que usa `Dialogo`) para confirmar
 *  aprovar/reprovar. Os dois usam `useEscParaFechar` — cada um registra seu
 *  proprio listener de `keydown` em fase de captura no `document`, e nenhum
 *  sabe da existencia do outro.
 *
 *  `stopPropagation()` (o que `useEscParaFechar` chama) NAO impede outros
 *  listeners no MESMO no e MESMA fase de rodar — so `stopImmediatePropagation`
 *  faria isso. Como os dois estao no `document` em fase de captura, um Escape
 *  so aciona os dois, na ordem em que foram registrados (isto e, o mais
 *  antigo primeiro), nao so o que esta visualmente por cima. */

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

/** Dispara um Escape de verdade a partir do elemento focado — nao direto no
 *  `document` — para respeitar a mesma ordem de captura/bolha que o
 *  navegador usa. Despachar direto no `document` (como um teste ingenuo
 *  faria) colapsa captura e bolha na mesma parada e mascara o bug. */
const pressionarEscape = () => {
  const alvo = document.activeElement ?? document.body;
  act(() => {
    alvo.dispatchEvent(
      new KeyboardEvent('keydown', { key: 'Escape', bubbles: true, cancelable: true }),
    );
  });
};

describe('Overlay stack — Escape empilhado (reproducao)', () => {
  it('BUG: Escape com GavetaDoCliente aberta e Dialogo por cima fecha os dois', () => {
    const aoFecharGaveta = vi.fn();
    const aoFecharDialogo = vi.fn();

    // A gaveta abre primeiro (o analista ve o cadastro do cliente)...
    act(() =>
      raiz.render(
        <>
          <GavetaDoCliente
            nome="Mercado do Bairro"
            cadastro={null}
            situacao={situacao}
            aoAbrirCompleto={vi.fn()}
            aoFechar={aoFecharGaveta}
          />
        </>,
      ),
    );

    // ...depois o Dialogo de decisao abre por cima (aprovar/reprovar).
    act(() =>
      raiz.render(
        <>
          <GavetaDoCliente
            nome="Mercado do Bairro"
            cadastro={null}
            situacao={situacao}
            aoAbrirCompleto={vi.fn()}
            aoFechar={aoFecharGaveta}
          />
          <Dialogo rotulo="Aprovar o pedido 123?" aoFechar={aoFecharDialogo}>
            <button type="button">Confirmar</button>
          </Dialogo>
        </>,
      ),
    );

    const confirmar = [...document.querySelectorAll('button')].find(
      (b) => b.textContent === 'Confirmar',
    ) as HTMLButtonElement;
    confirmar.focus();
    expect(document.activeElement).toBe(confirmar);

    pressionarEscape();

    // O esperado: SO o Dialogo (o overlay de cima) fecha.
    expect(aoFecharDialogo).toHaveBeenCalledTimes(1);
    expect(aoFecharGaveta).not.toHaveBeenCalled();
  });

  it('BUG (controle): dois Dialogo em sequencia — o segundo Escape fecha os dois de uma vez', () => {
    const aoFecharPrimeiro = vi.fn();
    const aoFecharSegundo = vi.fn();

    act(() =>
      raiz.render(
        <Dialogo rotulo="Primeiro" aoFechar={aoFecharPrimeiro}>
          <button type="button">Um</button>
        </Dialogo>,
      ),
    );
    act(() =>
      raiz.render(
        <>
          <Dialogo rotulo="Primeiro" aoFechar={aoFecharPrimeiro}>
            <button type="button">Um</button>
          </Dialogo>
          <Dialogo rotulo="Segundo" aoFechar={aoFecharSegundo}>
            <button type="button">Dois</button>
          </Dialogo>
        </>,
      ),
    );

    const dois = [...document.querySelectorAll('button')].find(
      (b) => b.textContent === 'Dois',
    ) as HTMLButtonElement;
    dois.focus();

    pressionarEscape();

    expect(aoFecharSegundo).toHaveBeenCalledTimes(1);
    expect(aoFecharPrimeiro).not.toHaveBeenCalled();
  });
});
