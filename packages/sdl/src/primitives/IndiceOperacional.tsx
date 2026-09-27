import type { HTMLAttributes } from 'react';
import { cn } from '../lib/cn';

/** Assinatura Synapse — Numeração Operacional (Fase 4.2).
 *
 *  Não é badge, não é pílula: é tipografia. Uma coluna de índice só faz
 *  sentido quando a lista tem posição/sequência/prioridade de verdade — não
 *  decore uma lista qualquer com isso. `font-data` liga os algarismos de
 *  largura fixa (a coluna não dança), e o cobalto de baixo contraste marca o
 *  índice como "sinal do sistema" sem competir com o conteúdo — fica cheio
 *  só quando a linha que ele numera está em destaque (`group-hover`/seleção,
 *  via o `group` do elemento pai). */
export interface IndiceOperacionalProps extends HTMLAttributes<HTMLSpanElement> {
  /** Posição 1-based; o componente cuida do zero à esquerda. */
  readonly posicao: number;
  /** Cobalto cheio, para quando a linha já está selecionada/ativa por outro
   *  meio (não por hover) — ex.: item corrente de uma navegação. */
  readonly destaque?: boolean;
}

export function IndiceOperacional({
  posicao,
  destaque,
  className,
  ...resto
}: IndiceOperacionalProps) {
  return (
    <span
      className={cn(
        'font-data text-caption inline-block w-[2ch] shrink-0 text-right tabular-nums',
        destaque ? 'text-primary' : 'text-primary/60 group-hover:text-primary',
        className,
      )}
      aria-hidden="true"
      {...resto}
    >
      {String(posicao).padStart(2, '0')}
    </span>
  );
}
