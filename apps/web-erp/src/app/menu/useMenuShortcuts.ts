import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import type { MenuPrincipal } from './menu.types';
import { atalhoCorresponde, todosOsItens } from './menu.utils';

/** Atalhos globais que vem do proprio menu (Ctrl+D, Ctrl+F8...). Funcionam em
 *  qualquer tela, como no Syndata, e so existem para itens que o tenant enxerga. */
export const useMenuShortcuts = (menus: readonly MenuPrincipal[]): void => {
  const navigate = useNavigate();

  useEffect(() => {
    const comAtalho = todosOsItens(menus).filter((item) => item.atalho);

    const aoTeclar = (evento: KeyboardEvent) => {
      if (evento.repeat) return;
      const alvo = comAtalho.find((item) => item.atalho && atalhoCorresponde(item.atalho, evento));
      if (!alvo) return;
      // Ctrl+D, Ctrl+O e Ctrl+L tem acao no navegador: a do sistema vence.
      evento.preventDefault();
      navigate(alvo.caminho);
    };

    document.addEventListener('keydown', aoTeclar);
    return () => document.removeEventListener('keydown', aoTeclar);
  }, [menus, navigate]);
};
