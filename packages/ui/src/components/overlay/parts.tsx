import type { ReactNode } from 'react';
import { cn } from '../../lib/cn';

/** Fundo escurecido. E um botao de verdade para que o clique fora tenha
 *  equivalente de teclado sem violar as regras de acessibilidade. */
export function Backdrop({
  closing,
  onClick,
}: {
  readonly closing: boolean;
  readonly onClick: () => void;
}) {
  return (
    <button
      type="button"
      tabIndex={-1}
      aria-label="Fechar"
      onClick={onClick}
      className={cn(
        'absolute inset-0 h-full w-full cursor-default bg-slate-950/55 backdrop-blur-md',
        closing ? 'animate-backdrop-out' : 'animate-backdrop-in',
        'motion-reduce:animate-none',
      )}
    />
  );
}

export interface OverlayHeaderProps {
  readonly titleId: string;
  readonly title: ReactNode;
  readonly description?: ReactNode;
  readonly eyebrow?: ReactNode;
  readonly onClose: () => void;
}

export function OverlayHeader({
  titleId,
  title,
  description,
  eyebrow,
  onClose,
}: OverlayHeaderProps) {
  return (
    <header className="flex items-start justify-between gap-4 border-b border-slate-100 px-6 py-5 sm:px-7 dark:border-slate-800">
      <div className="min-w-0">
        {eyebrow && (
          <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-blue-600">
            {eyebrow}
          </p>
        )}
        <h2
          id={titleId}
          className="mt-1 truncate text-xl font-bold tracking-[-0.02em] text-slate-950 dark:text-slate-100"
        >
          {title}
        </h2>
        {description && (
          <p className="mt-1 text-sm leading-6 text-slate-500 dark:text-slate-400">{description}</p>
        )}
      </div>
      <button
        type="button"
        onClick={onClose}
        aria-label="Fechar"
        className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-slate-400 transition hover:bg-slate-100 hover:text-slate-800 focus:outline-none focus:ring-4 focus:ring-blue-500/15 dark:hover:bg-slate-800 dark:hover:text-slate-100"
      >
        <svg
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinecap="round"
          className="h-5 w-5"
          aria-hidden="true"
        >
          <path d="m6 6 12 12M18 6 6 18" />
        </svg>
      </button>
    </header>
  );
}

export function OverlayFooter({
  children,
  className,
}: {
  readonly children: ReactNode;
  readonly className?: string;
}) {
  return (
    <footer
      className={cn(
        'flex items-center justify-between gap-3 border-t border-slate-100 bg-slate-50/70 px-6 py-4 sm:px-7',
        'dark:border-slate-800 dark:bg-slate-950/40',
        className,
      )}
    >
      {children}
    </footer>
  );
}
