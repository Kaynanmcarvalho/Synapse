import { type CSSProperties, type RefObject, useLayoutEffect, useState } from 'react';

export type LadoDoPainel = 'abaixo' | 'lateral';

const MARGEM = 8;

/** Posiciona um painel flutuante junto da ancora sem sair da tela.
 *
 *  `abaixo` e o dropdown do menu principal; `lateral` e o submenu, que abre a
 *  direita e vira para a esquerda quando nao cabe — o caso do menu Suporte, colado
 *  na borda. Mede no layout effect, antes da pintura: o painel nunca pisca na
 *  posicao errada. */
export const usePosicaoFlutuante = (
  ancora: HTMLElement | null,
  painel: RefObject<HTMLElement | null>,
  lado: LadoDoPainel,
): CSSProperties => {
  const [estilo, setEstilo] = useState<CSSProperties>({
    position: 'fixed',
    top: -9999,
    left: -9999,
  });

  useLayoutEffect(() => {
    const elemento = painel.current;
    if (!ancora || !elemento) return;

    const retangulo = ancora.getBoundingClientRect();
    const largura = elemento.offsetWidth;
    const altura = elemento.scrollHeight;
    const larguraDaTela = window.innerWidth;
    const alturaDaTela = window.innerHeight;

    let top = lado === 'abaixo' ? retangulo.bottom + 6 : retangulo.top - 6;
    let left = lado === 'abaixo' ? retangulo.left : retangulo.right + 4;

    if (left + largura > larguraDaTela - MARGEM) {
      left = lado === 'abaixo' ? larguraDaTela - largura - MARGEM : retangulo.left - largura - 4;
    }
    if (lado === 'lateral' && top + altura > alturaDaTela - MARGEM) {
      top = alturaDaTela - MARGEM - altura;
    }
    top = Math.max(MARGEM, top);
    left = Math.max(MARGEM, left);

    setEstilo({ position: 'fixed', top, left, maxHeight: alturaDaTela - top - MARGEM });
  }, [ancora, painel, lado]);

  return estilo;
};
