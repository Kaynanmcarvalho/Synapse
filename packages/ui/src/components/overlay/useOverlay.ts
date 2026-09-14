import { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';

/** Duracao da animacao de saida; precisa casar com `animate-*-out` do preset. */
const EXIT_MS = 200;

const FOCUSABLE = [
  'a[href]',
  'button:not([disabled])',
  'input:not([disabled])',
  'select:not([disabled])',
  'textarea:not([disabled])',
  '[tabindex]:not([tabindex="-1"])',
].join(',');

/** Fechar de dentro do conteudo (um botao no rodape, por exemplo) sem que o
 *  componente precise receber a funcao por prop em cada nivel. */
const CloseContext = createContext<() => void>(() => {});

/** As sobreposições abertas, da mais antiga à mais nova. Esc e Tab são só da
 *  que está por cima: a lupa aberta dentro de uma ficha fecha a lupa, e não a
 *  ficha inteira. */
const abertas: symbol[] = [];
const estaPorCima = (marca: symbol) => abertas[abertas.length - 1] === marca;

export const OverlayCloseProvider = CloseContext.Provider;

export const useOverlayClose = (): (() => void) => useContext(CloseContext);

const prefersReducedMotion = (): boolean =>
  typeof window !== 'undefined' &&
  window.matchMedia?.('(prefers-reduced-motion: reduce)').matches === true;

const visibleFocusable = (root: HTMLElement): HTMLElement[] =>
  Array.from(root.querySelectorAll<HTMLElement>(FOCUSABLE)).filter(
    (element) => element.offsetParent !== null || element === root,
  );

export interface OverlayOptions {
  /** Chamado depois da animacao de saida — e onde o pai desmonta a sobreposicao. */
  readonly onClose: () => void;
  /** Clique no fundo fecha. Desligue em fluxos com dados nao salvos. */
  readonly closeOnBackdrop?: boolean;
}

export interface Overlay {
  readonly panelRef: React.RefObject<HTMLDivElement | null>;
  readonly closing: boolean;
  readonly requestClose: () => void;
  readonly onBackdropClick: () => void;
}

/** Comportamento comum a Modal e Drawer: Esc, clique no fundo, trava de rolagem,
 *  foco preso no painel, devolucao do foco e saida animada. */
export const useOverlay = ({ onClose, closeOnBackdrop = true }: OverlayOptions): Overlay => {
  const panelRef = useRef<HTMLDivElement | null>(null);
  const [closing, setClosing] = useState(false);
  const closingRef = useRef(false);
  const marca = useRef(Symbol('overlay'));

  useEffect(() => {
    const minha = marca.current;
    abertas.push(minha);
    return () => {
      const indice = abertas.lastIndexOf(minha);
      if (indice >= 0) abertas.splice(indice, 1);
    };
  }, []);

  const requestClose = useCallback(() => {
    if (closingRef.current) return;
    closingRef.current = true;
    setClosing(true);
    window.setTimeout(onClose, prefersReducedMotion() ? 0 : EXIT_MS);
  }, [onClose]);

  useEffect(() => {
    const previous = document.activeElement as HTMLElement | null;
    const overflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const panel = panelRef.current;
    const first = panel ? visibleFocusable(panel)[0] : null;
    (first ?? panel)?.focus({ preventScroll: true });
    return () => {
      document.body.style.overflow = overflow;
      previous?.focus?.({ preventScroll: true });
    };
  }, []);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (!estaPorCima(marca.current)) return;
      const panel = panelRef.current;
      if (event.key === 'Escape') {
        event.stopPropagation();
        requestClose();
        return;
      }
      if (event.key !== 'Tab' || !panel) return;
      const items = visibleFocusable(panel);
      if (items.length === 0) return;
      const first = items[0];
      const last = items[items.length - 1];
      if (!first || !last) return;
      const active = document.activeElement;
      if (event.shiftKey && (active === first || active === panel)) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && active === last) {
        event.preventDefault();
        first.focus();
      }
    };
    document.addEventListener('keydown', onKeyDown, true);
    return () => document.removeEventListener('keydown', onKeyDown, true);
  }, [requestClose]);

  const onBackdropClick = useCallback(() => {
    if (closeOnBackdrop) requestClose();
  }, [closeOnBackdrop, requestClose]);

  return { panelRef, closing, requestClose, onBackdropClick };
};
