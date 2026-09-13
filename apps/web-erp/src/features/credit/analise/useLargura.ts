import { useEffect, useState, type RefObject } from 'react';

/** Largura de um elemento, acompanhando o redimensionamento. A janela da
 *  analise muda de tamanho sem mudar a tela, entao o breakpoint e dela, e nao
 *  do navegador. Sem ResizeObserver (testes), assume largo. */
export const useLargura = (ref: RefObject<HTMLElement | null>, inicial = 1200): number => {
  const [largura, setLargura] = useState(inicial);
  useEffect(() => {
    const elemento = ref.current;
    if (!elemento || typeof ResizeObserver === 'undefined') return undefined;
    const observador = new ResizeObserver(([entrada]) => {
      if (entrada) setLargura(Math.round(entrada.contentRect.width));
    });
    observador.observe(elemento);
    return () => observador.disconnect();
  }, [ref]);
  return largura;
};
