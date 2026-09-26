import type { ElementType, HTMLAttributes, ReactNode } from 'react';
import { cn } from '../lib/cn';

/** Os planos da aplicacao.
 *
 *  SURFACE NAO E CARD. Um cartao e uma escolha de composicao — junta um assunto
 *  e o separa do resto. `Surface` so diz em que plano aquele trecho esta:
 *  a folha da pagina, o painel apoiado nela, o campo afundado dentro do painel.
 *
 *  Por isso nao existe padding automatico aqui. Quem precisa de respiro decide o
 *  respiro; quando todo agrupamento ganha padding e sombra sozinho, a tela volta
 *  a ser um tabuleiro de cartoes. */

export type PlanoDeSuperficie = 'pagina' | 'painel' | 'elevada' | 'afundada';

const PLANO: Readonly<Record<PlanoDeSuperficie, string>> = {
  /** A folha. Sem borda, sem raio: e o fundo do trabalho. */
  pagina: 'bg-surface-pagina',
  /** Apoiada na folha: linha antes de sombra. */
  painel: 'bg-surface-painel border border-line-fina rounded-painel',
  /** So para o que realmente flutua (menu, janela) — sombra curta do sistema. */
  elevada: 'bg-surface-elevada border border-line-fina rounded-painel shadow-cartao',
  /** Dentro do painel: campo, area de leitura, celula de destaque. */
  afundada: 'bg-surface-afundada border border-line-fina rounded-controle',
};

export interface SurfaceProps extends HTMLAttributes<HTMLElement> {
  readonly variant?: PlanoDeSuperficie;
  readonly as?: ElementType;
  readonly children?: ReactNode;
}

export function Surface({ variant = 'painel', as, className, children, ...resto }: SurfaceProps) {
  const Elemento = as ?? 'div';
  return (
    <Elemento className={cn(PLANO[variant], className)} {...resto}>
      {children}
    </Elemento>
  );
}
