import { createContext, useContext } from 'react';
import type { MenuPrincipal } from '../menu/menu.types';

interface ContextoDaCasca {
  /** Abre o "O que você precisa?" — a busca global do Ctrl+K. */
  readonly abrirBusca: () => void;
  /** O menu ja filtrado pelas funcionalidades ligadas para o tenant. */
  readonly menus: readonly MenuPrincipal[];
}

export const ShellContext = createContext<ContextoDaCasca>({
  abrirBusca: () => undefined,
  menus: [],
});

export const useShell = (): ContextoDaCasca => useContext(ShellContext);
