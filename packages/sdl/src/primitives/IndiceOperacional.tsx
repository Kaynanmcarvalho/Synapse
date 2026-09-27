import type { HTMLAttributes } from 'react';
import { cn } from '../lib/cn';

/** Assinatura Synapse — Numeração Operacional (Fase 4.2, contraste revisto na
 *  Fase 4.4).
 *
 *  Não é badge, não é pílula: é tipografia. Uma coluna de índice só faz
 *  sentido quando a lista tem posição/sequência/prioridade de verdade — não
 *  decore uma lista qualquer com isso. `font-data` liga os algarismos de
 *  largura fixa (a coluna não dança), e o cobalto marca o índice como "sinal
 *  do sistema" sem competir com o conteúdo — fica cheio só quando a linha que
 *  ele numera está em destaque (`group-hover`/seleção, via o `group` do
 *  elemento pai).
 *
 *  A Fase 4.3 auditou o repouso em `text-primary/45` (depois `/60`): ~2,7:1
 *  contra branco — sobrevive de perto, mas quase some em escala de cinza ou a
 *  50% de zoom, exatamente o teste que a Fase 4.4 pediu. `/85` mede ~4,5:1
 *  (referência AA, mesmo sendo `aria-hidden`/decorativo) e continua
 *  visivelmente mais quieto que o cobalto cheio do estado em destaque —
 *  validado visualmente, não só pelo número. */
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
        destaque ? 'text-primary' : 'text-primary/85 group-hover:text-primary',
        className,
      )}
      aria-hidden="true"
      {...resto}
    >
      {String(posicao).padStart(2, '0')}
    </span>
  );
}
