import { useEffect, useState } from 'react';
import type { Area } from './geometria';

/** Abaixo disso nao ha espaco para arrastar nada: a janela ocupa a tela toda. */
export const LARGURA_DE_JANELA = 1024;

const medir = (): Area => ({
  largura: window.innerWidth,
  altura: window.innerHeight,
  // O cabecalho do sistema continua visivel e clicavel: a janela nunca sobe
  // por cima do menu.
  topo: document.querySelector('header')?.getBoundingClientRect().height ?? 112,
});

/** Area util da tela, sempre atual. Redimensionar a janela do navegador nao
 *  pode deixar uma janela flutuante fora do alcance. */
export const useAreaDaTela = (): { readonly area: Area; readonly estreito: boolean } => {
  const [area, setArea] = useState<Area>(() =>
    typeof window === 'undefined' ? { largura: 1440, altura: 900, topo: 112 } : medir(),
  );

  useEffect(() => {
    const atualizar = () => setArea(medir());
    atualizar();
    window.addEventListener('resize', atualizar);
    return () => window.removeEventListener('resize', atualizar);
  }, []);

  return { area, estreito: area.largura < LARGURA_DE_JANELA };
};
