import { useId, type ReactNode } from 'react';
import { cn } from '../../lib/cn';
import { Backdrop, OverlayFooter, OverlayHeader } from './parts';
import { OverlayCloseProvider, useOverlay } from './useOverlay';

export type ModalSize = 'sm' | 'md' | 'lg' | 'xl' | 'full';

const SIZE: Record<ModalSize, string> = {
  sm: 'sm:max-w-md',
  md: 'sm:max-w-lg',
  lg: 'sm:max-w-2xl',
  xl: 'sm:max-w-4xl',
  full: 'sm:max-w-6xl',
};

export interface ModalProps {
  /** Desmonta a sobreposicao; ja e chamado depois da animacao de saida. */
  readonly onClose: () => void;
  readonly title?: ReactNode;
  readonly description?: ReactNode;
  readonly eyebrow?: ReactNode;
  /** Obrigatorio quando nao ha titulo: o dialogo precisa de nome acessivel. */
  readonly label?: string;
  readonly size?: ModalSize;
  readonly footer?: ReactNode;
  readonly closeOnBackdrop?: boolean;
  /** Entrega o painel vazio para layouts proprios (sem cabecalho nem rolagem). */
  readonly bare?: boolean;
  readonly className?: string;
  readonly bodyClassName?: string;
  readonly children: ReactNode;
}

/** Dialogo centralizado no desktop e folha inferior no celular — Esc, clique no
 *  fundo e foco preso vem do `useOverlay`. */
export function Modal({
  onClose,
  title,
  description,
  eyebrow,
  label,
  size = 'md',
  footer,
  closeOnBackdrop = true,
  bare = false,
  className,
  bodyClassName,
  children,
}: ModalProps) {
  const titleId = useId();
  const { panelRef, closing, requestClose, onBackdropClick } = useOverlay({
    onClose,
    closeOnBackdrop,
  });

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center sm:p-6">
      <Backdrop closing={closing} onClick={onBackdropClick} />
      <OverlayCloseProvider value={requestClose}>
        <div
          ref={panelRef}
          role="dialog"
          aria-modal="true"
          aria-labelledby={title ? titleId : undefined}
          aria-label={title ? undefined : label}
          tabIndex={-1}
          className={cn(
            'relative flex max-h-[94vh] w-full flex-col overflow-hidden rounded-t-3xl bg-white outline-none',
            'shadow-[0_32px_90px_-20px_rgba(2,6,23,.55)] sm:max-h-[88vh] sm:rounded-3xl dark:bg-slate-900',
            closing
              ? 'animate-sheet-out-bottom sm:animate-modal-out'
              : 'animate-sheet-in-bottom sm:animate-modal-in',
            'motion-reduce:animate-none',
            SIZE[size],
            className,
          )}
        >
          {bare ? (
            children
          ) : (
            <>
              {title && (
                <OverlayHeader
                  titleId={titleId}
                  title={title}
                  description={description}
                  eyebrow={eyebrow}
                  onClose={requestClose}
                />
              )}
              <div
                className={cn('min-h-0 flex-1 overflow-y-auto px-6 py-5 sm:px-7', bodyClassName)}
              >
                {children}
              </div>
              {footer && <OverlayFooter>{footer}</OverlayFooter>}
            </>
          )}
        </div>
      </OverlayCloseProvider>
    </div>
  );
}
