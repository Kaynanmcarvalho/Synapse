import { useId, type ReactNode } from 'react';
import { cn } from '../../lib/cn';
import { Backdrop, OverlayFooter, OverlayHeader } from './parts';
import { OverlayCloseProvider, useOverlay } from './useOverlay';

export type DrawerWidth = 'sm' | 'md' | 'lg';

const WIDTH: Record<DrawerWidth, string> = {
  sm: 'sm:max-w-sm',
  md: 'sm:max-w-md',
  lg: 'sm:max-w-xl',
};

export interface DrawerProps {
  readonly onClose: () => void;
  readonly title: ReactNode;
  readonly description?: ReactNode;
  readonly eyebrow?: ReactNode;
  readonly width?: DrawerWidth;
  readonly footer?: ReactNode;
  readonly closeOnBackdrop?: boolean;
  readonly className?: string;
  readonly children: ReactNode;
}

/** Gaveta lateral para detalhes e conferencias: desliza da direita no desktop e
 *  sobe como folha no celular, sem tirar o operador da tela onde ele estava. */
export function Drawer({
  onClose,
  title,
  description,
  eyebrow,
  width = 'md',
  footer,
  closeOnBackdrop = true,
  className,
  children,
}: DrawerProps) {
  const titleId = useId();
  const { panelRef, closing, requestClose, onBackdropClick } = useOverlay({
    onClose,
    closeOnBackdrop,
  });

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-end sm:items-stretch">
      <Backdrop closing={closing} onClick={onBackdropClick} />
      <OverlayCloseProvider value={requestClose}>
        <div
          ref={panelRef}
          role="dialog"
          aria-modal="true"
          aria-labelledby={titleId}
          tabIndex={-1}
          className={cn(
            'relative flex max-h-[92vh] w-full flex-col overflow-hidden rounded-t-3xl bg-white outline-none',
            'shadow-[0_32px_90px_-20px_rgba(2,6,23,.55)] sm:max-h-none sm:rounded-none sm:rounded-l-3xl',
            'dark:bg-slate-900',
            closing
              ? 'animate-sheet-out-bottom sm:animate-sheet-out-right'
              : 'animate-sheet-in-bottom sm:animate-sheet-in-right',
            'motion-reduce:animate-none',
            WIDTH[width],
            className,
          )}
        >
          <OverlayHeader
            titleId={titleId}
            title={title}
            description={description}
            eyebrow={eyebrow}
            onClose={requestClose}
          />
          <div className="min-h-0 flex-1 overflow-y-auto px-6 py-5 sm:px-7">{children}</div>
          {footer && <OverlayFooter>{footer}</OverlayFooter>}
        </div>
      </OverlayCloseProvider>
    </div>
  );
}
