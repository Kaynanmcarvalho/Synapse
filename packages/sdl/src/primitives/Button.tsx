import type { ButtonHTMLAttributes, ReactNode, Ref } from 'react';
import { cn } from '../lib/cn';
import { Spinner } from './Spinner';
import { ALTURA, FOCO_DE_ACAO, TAMANHO_DE_ICONE, type Densidade } from './visual';

/** A acao do Synapse.
 *
 *  Quatro hierarquias, e so. `primary` e a acao da tela; `secondary` e a
 *  alternativa de mesmo peso operacional; `quiet` e o que vive em barra de
 *  ferramentas e nao deve competir com o conteudo; `danger` e o que destroi ou
 *  bloqueia alguma coisa.
 *
 *  Nao e pilula, nao tem sombra, nao tem gradiente e nao cresce para chamar
 *  atencao: 36px de altura, raio de controle e a marca usada com disciplina. */

export type VarianteDeBotao = 'primary' | 'secondary' | 'quiet' | 'danger';

const VARIANTE: Readonly<Record<VarianteDeBotao, string>> = {
  primary: cn(
    'bg-primary text-primary-on hover:bg-primary-deep active:bg-primary-deep',
    'disabled:bg-faint disabled:text-surface-painel',
    FOCO_DE_ACAO,
  ),
  secondary: cn(
    'border border-line-fina bg-surface-painel text-ink',
    'hover:border-faint hover:bg-surface-afundada',
    'disabled:border-line-fina disabled:bg-surface-suave disabled:text-ink-desabilitado',
    FOCO_DE_ACAO,
  ),
  quiet: cn(
    'text-ink-medio hover:bg-surface-suave hover:text-ink active:bg-surface-hover',
    'disabled:text-ink-desabilitado disabled:hover:bg-transparent',
    FOCO_DE_ACAO,
  ),
  danger: cn(
    'bg-status-perigo text-primary-on hover:bg-status-bloqueado active:bg-status-bloqueado',
    'disabled:bg-faint disabled:text-surface-painel',
    'focus-visible:ring-2 focus-visible:ring-status-perigo/40 focus-visible:ring-offset-2 focus-visible:ring-offset-surface-pagina',
  ),
};

const RECUO: Readonly<Record<Densidade, string>> = {
  compacta: 'px-3 text-button-sm',
  padrao: 'px-3.5 text-button-sm',
  confortavel: 'px-5 text-button-md',
};

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  readonly variant?: VarianteDeBotao;
  readonly density?: Densidade;
  /** Mostra a espera no lugar do icone e impede o segundo clique. */
  readonly loading?: boolean;
  readonly children?: ReactNode;
  readonly ref?: Ref<HTMLButtonElement>;
}

export function Button({
  variant = 'secondary',
  density = 'padrao',
  loading = false,
  type = 'button',
  disabled,
  className,
  children,
  ...resto
}: ButtonProps) {
  return (
    <button
      type={type}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      className={cn(
        'rounded-controle inline-flex shrink-0 items-center justify-center gap-2 whitespace-nowrap',
        'duration-rapido ease-padrao outline-none transition-colors disabled:cursor-not-allowed',
        ALTURA[density],
        RECUO[density],
        VARIANTE[variant],
        className,
      )}
      {...resto}
    >
      {loading ? <Spinner size={TAMANHO_DE_ICONE[density]} decorative /> : null}
      {children}
    </button>
  );
}
