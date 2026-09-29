import { useEffect, useRef, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { useEscParaFechar } from './useEscParaFechar';

/** Dialogo modal por cima de tudo. Esc fecha; o foco vai para o primeiro campo
 *  ou botao que o conteudo marcar com `data-autofoco`.
 *
 *  Fase 6.4: movido de `features/credit/ui/Superficies.tsx` para cá — nasceu
 *  ali junto com a fila de crédito, mas nunca teve nada específico do
 *  domínio (só `useEscParaFechar`, que também não tem). Aqui é onde vive de
 *  verdade: base da Decision Grammar (Fase 6.4), reutilizável por qualquer
 *  tela que precise de uma confirmação, não só crédito. `Superficies.tsx`
 *  reexporta a partir daqui para não quebrar seus consumidores existentes. */
const SELETOR_FOCAVEL =
  'a[href], button:not([disabled]), textarea:not([disabled]), input:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])';

export function Dialogo({
  rotulo,
  aoFechar,
  children,
  largura = 'max-w-md',
}: {
  readonly rotulo: string;
  readonly aoFechar: () => void;
  readonly children: ReactNode;
  readonly largura?: string;
}) {
  const caixa = useRef<HTMLDivElement>(null);
  useEscParaFechar(aoFechar);

  // Precisa rodar ANTES do efeito de autofoco abaixo: se captura depois,
  // "quem abriu" já seria o próprio diálogo, e fechar devolveria o foco pra
  // ele mesmo (desmontado) em vez de para o que tinha foco de verdade.
  useEffect(() => {
    const anterior = document.activeElement as HTMLElement | null;
    return () => anterior?.focus?.({ preventScroll: true });
  }, []);

  useEffect(() => {
    caixa.current?.querySelector<HTMLElement>('[data-autofoco]')?.focus();
  }, []);

  useEffect(() => {
    const aoTeclar = (evento: KeyboardEvent) => {
      if (evento.key !== 'Tab') return;
      const raiz = caixa.current;
      if (!raiz) return;
      const focaveis = [...raiz.querySelectorAll<HTMLElement>(SELETOR_FOCAVEL)];
      if (focaveis.length === 0) return;
      const primeiro = focaveis[0];
      const ultimo = focaveis[focaveis.length - 1];
      if (evento.shiftKey && document.activeElement === primeiro) {
        evento.preventDefault();
        ultimo?.focus();
      } else if (!evento.shiftKey && document.activeElement === ultimo) {
        evento.preventDefault();
        primeiro?.focus();
      }
    };
    document.addEventListener('keydown', aoTeclar);
    return () => document.removeEventListener('keydown', aoTeclar);
  }, []);

  return createPortal(
    <div className="bg-canvas-dark/30 animate-revelar fixed inset-0 z-[90] flex items-center justify-center p-4 backdrop-blur-[2px] motion-reduce:animate-none">
      <div
        ref={caixa}
        role="dialog"
        aria-modal="true"
        aria-label={rotulo}
        className={`bg-canvas-light shadow-janela animate-surgir max-h-[calc(100vh-2rem)] w-full overflow-y-auto rounded-2xl p-6 motion-reduce:animate-none ${largura}`}
      >
        {children}
      </div>
    </div>,
    document.body,
  );
}

export const BOTAO_CLARO =
  'bg-surface-soft text-button-sm text-ink inline-flex h-9 items-center gap-2 rounded-full px-4 transition hover:bg-[#ececee] disabled:cursor-not-allowed disabled:opacity-40';

export const BOTAO_ESCURO =
  'bg-canvas-dark text-button-sm hover:bg-charcoal inline-flex h-9 items-center gap-2 rounded-full px-4 text-white transition disabled:cursor-not-allowed disabled:opacity-40';

export const BOTAO_ALERTA =
  'text-button-sm inline-flex h-9 items-center gap-2 rounded-full bg-[#b3242f] px-4 text-white transition hover:bg-[#931d27] disabled:cursor-not-allowed disabled:opacity-40';

export const BOTAO_REPROVAR =
  'bg-surface-soft text-button-sm inline-flex h-9 items-center gap-2 rounded-full px-4 text-[#b3242f] transition hover:bg-[#fdeced] disabled:cursor-not-allowed disabled:opacity-40';
