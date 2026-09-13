import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { SimulacaoDeParcelas } from './parcelas/SimulacaoDeParcelas';
import { Dialogo } from './ui/Superficies';

/** Esc fecha so o que esta por cima. A janela flutuante fecha com Esc; a
 *  simulacao e os dialogos abertos sobre ela nao podem levar a janela junto. */

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

let raiz: Root;
let caixa: HTMLDivElement;
const janelaFechou = vi.fn();
const escDaJanela = (evento: KeyboardEvent) => evento.key === 'Escape' && janelaFechou();

beforeEach(() => {
  janelaFechou.mockClear();
  caixa = document.createElement('div');
  document.body.appendChild(caixa);
  raiz = createRoot(caixa);
  // A janela escuta o Esc no document, na fase de bolha — como o Janela.tsx.
  document.addEventListener('keydown', escDaJanela);
});

afterEach(() => {
  document.removeEventListener('keydown', escDaJanela);
  act(() => raiz.unmount());
  caixa.remove();
});

const esc = () =>
  act(() =>
    document.body.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true })),
  );

const pedido = {
  tipo: 'VENDA' as const,
  formaDePagamento: 'Boleto',
  condicaoDePagamento: '28/35/42',
  vencimentosEmDias: [28, 35, 42],
  totalCentavos: 90_000,
  situacao: 'AGUARDANDO_ANALISE' as const,
  nota: null,
};

describe('Esc nos sobrepostos', () => {
  it('fecha a simulacao de parcelas sem fechar a janela da analise', () => {
    act(() => raiz.render(<SimulacaoDeParcelas pedido={pedido} />));
    act(() => caixa.querySelector<HTMLButtonElement>('button')?.click());
    expect(document.querySelector('[aria-label="Simulação de parcelas"]')).not.toBeNull();
    esc();
    expect(document.querySelector('[aria-label="Simulação de parcelas"]')).toBeNull();
    expect(janelaFechou).not.toHaveBeenCalled();
  });

  it('fecha o dialogo de decisao sem fechar a janela embaixo', () => {
    const fecharDialogo = vi.fn();
    act(() =>
      raiz.render(
        <Dialogo rotulo="Aprovar" aoFechar={fecharDialogo}>
          conteúdo
        </Dialogo>,
      ),
    );
    esc();
    expect(fecharDialogo).toHaveBeenCalledTimes(1);
    expect(janelaFechou).not.toHaveBeenCalled();
  });

  it('sem sobreposto aberto, o Esc chega na janela', () => {
    esc();
    expect(janelaFechou).toHaveBeenCalledTimes(1);
  });
});
