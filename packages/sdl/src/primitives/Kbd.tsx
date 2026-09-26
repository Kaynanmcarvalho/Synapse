import type { HTMLAttributes, ReactNode } from 'react';
import { cn } from '../lib/cn';

/** A tecla, do jeito que software de mesa mostra.
 *
 *  O Synapse vive de atalho (Ctrl+K, Ctrl+I, F2), entao a tecla aparece o tempo
 *  todo ao lado de menu e botao. Ela precisa ser lida sem roubar a linha: chip
 *  curto, contraste baixo, algarismo de largura fixa. Nao e capsula colorida. */

export interface KbdProps extends HTMLAttributes<HTMLElement> {
  readonly children: ReactNode;
}

export function Kbd({ className, children, ...resto }: KbdProps) {
  return (
    <kbd
      className={cn(
        'border-line-fina bg-surface-afundada text-ink-apoio font-data text-caption',
        'rounded-minimo inline-flex h-[22px] min-w-[22px] items-center justify-center border px-1.5',
        className,
      )}
      {...resto}
    >
      {children}
    </kbd>
  );
}
