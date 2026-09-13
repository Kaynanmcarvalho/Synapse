import { useEffect } from 'react';

/** Esc fecha o que esta por cima — e so ele. Escuta na fase de captura e para
 *  a propagacao, entao a janela flutuante que esta embaixo (que tambem fecha
 *  com Esc) continua aberta. */
export const useEscParaFechar = (aoFechar: () => void, ativo = true): void => {
  useEffect(() => {
    if (!ativo) return undefined;
    const aoTeclar = (evento: KeyboardEvent) => {
      if (evento.key !== 'Escape') return;
      evento.stopPropagation();
      aoFechar();
    };
    document.addEventListener('keydown', aoTeclar, true);
    return () => document.removeEventListener('keydown', aoTeclar, true);
  }, [aoFechar, ativo]);
};
