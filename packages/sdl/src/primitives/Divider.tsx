import type { HTMLAttributes } from 'react';
import { cn } from '../lib/cn';

/** Linha antes de sombra.
 *
 *  Separar por linha, em vez de colocar cada trecho dentro de uma caixa, e uma
 *  das assinaturas do Synapse: mantem a superficie continua e a leitura calma. */

export interface DividerProps extends HTMLAttributes<HTMLDivElement> {
  readonly orientation?: 'horizontal' | 'vertical';
}

export function Divider({ orientation = 'horizontal', className, ...resto }: DividerProps) {
  return (
    <div
      role="separator"
      aria-orientation={orientation}
      className={cn(
        'bg-line-fina',
        orientation === 'horizontal' ? 'h-px w-full' : 'w-px self-stretch',
        className,
      )}
      {...resto}
    />
  );
}
