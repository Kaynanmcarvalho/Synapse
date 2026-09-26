import type { HTMLAttributes, ReactNode } from 'react';
import { cn } from '../lib/cn';

/** Situacao, com significado.
 *
 *  STATUS NAO E SEMPRE UMA PILULA COLORIDA. Uma tela de ERP mostra situacao em
 *  quase toda linha; se cada uma virar um chip colorido, o olho perde a
 *  capacidade de achar o que importa — vira carnaval de selo.
 *
 *  Por isso o padrao e `dot`: um ponto na cor do estado e o texto em tom de
 *  leitura. `text` pinta a palavra quando a situacao e a informacao principal
 *  da linha. `chip` existe para o caso raro em que a situacao precisa ser
 *  encontrada de relance num bloco denso — e so entao. */

export type TomDeStatus =
  'ok' | 'info' | 'atencao' | 'perigo' | 'vencido' | 'bloqueado' | 'pendente' | 'neutro';

/** Classes escritas por extenso: o Tailwind so gera o que consegue ler no
 *  codigo, e nome montado em tempo de execucao nunca chega no CSS. */
const PONTO: Readonly<Record<TomDeStatus, string>> = {
  ok: 'bg-status-ok-indicador',
  info: 'bg-status-info-indicador',
  atencao: 'bg-status-atencao-indicador',
  perigo: 'bg-status-perigo-indicador',
  vencido: 'bg-status-vencido-indicador',
  bloqueado: 'bg-status-bloqueado-indicador',
  pendente: 'bg-status-pendente-indicador',
  neutro: 'bg-status-neutro-indicador',
};

const TEXTO: Readonly<Record<TomDeStatus, string>> = {
  ok: 'text-status-ok',
  info: 'text-status-info',
  atencao: 'text-status-atencao',
  perigo: 'text-status-perigo',
  vencido: 'text-status-vencido',
  bloqueado: 'text-status-bloqueado',
  pendente: 'text-status-pendente',
  neutro: 'text-status-neutro',
};

const CHIP: Readonly<Record<TomDeStatus, string>> = {
  ok: 'bg-status-ok-fundo text-status-ok',
  info: 'bg-status-info-fundo text-status-info',
  atencao: 'bg-status-atencao-fundo text-status-atencao',
  perigo: 'bg-status-perigo-fundo text-status-perigo',
  vencido: 'bg-status-vencido-fundo text-status-vencido',
  bloqueado: 'bg-status-bloqueado-fundo text-status-bloqueado',
  pendente: 'bg-status-pendente-fundo text-status-pendente',
  neutro: 'bg-status-neutro-fundo text-status-neutro',
};

export interface StatusProps extends HTMLAttributes<HTMLSpanElement> {
  readonly tone: TomDeStatus;
  readonly variant?: 'dot' | 'text' | 'chip';
  readonly children: ReactNode;
}

export function Status({ tone, variant = 'dot', className, children, ...resto }: StatusProps) {
  if (variant === 'chip') {
    return (
      <span
        className={cn(
          'text-caption rounded-pequeno inline-flex h-[22px] items-center px-2 font-medium',
          CHIP[tone],
          className,
        )}
        {...resto}
      >
        {children}
      </span>
    );
  }

  return (
    <span
      className={cn(
        'text-body-sm inline-flex items-center gap-2',
        variant === 'text' ? TEXTO[tone] : 'text-ink-padrao',
        className,
      )}
      {...resto}
    >
      {variant === 'dot' ? (
        <span aria-hidden="true" className={cn('h-1.5 w-1.5 shrink-0 rounded-full', PONTO[tone])} />
      ) : null}
      {children}
    </span>
  );
}
