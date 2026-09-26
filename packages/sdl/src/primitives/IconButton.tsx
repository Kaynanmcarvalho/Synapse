import type { ButtonHTMLAttributes, ReactNode, Ref } from 'react';
import { cn } from '../lib/cn';
import { ALTURA, FOCO_DE_ACAO, type Densidade } from './visual';

/** Acao de glifo so.
 *
 *  ICON BUTTON NAO E SEMPRE UM CIRCULO. O circulo permanente enche a tela de
 *  bolhas; aqui a area de clique e quadrada e so o hover revela a superficie.
 *  Quem quiser o circulo pede (`shape="circle"`) — e para avatar e para acao
 *  isolada em cima de foto, nao para a barra de ferramentas inteira.
 *
 *  `label` e obrigatorio: botao sem nome acessivel e botao mudo no leitor de
 *  tela. O glifo vem como filho, no tamanho do sistema. */

export interface IconButtonProps extends Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'children'> {
  readonly label: string;
  readonly variant?: 'quiet' | 'secondary';
  readonly density?: Densidade;
  readonly shape?: 'square' | 'circle';
  readonly children: ReactNode;
  readonly ref?: Ref<HTMLButtonElement>;
}

const LARGURA: Readonly<Record<Densidade, string>> = {
  compacta: 'w-controle-compacta',
  padrao: 'w-controle-padrao',
  confortavel: 'w-controle-confortavel',
};

const VARIANTE = {
  quiet:
    'text-ink-medio hover:bg-surface-suave hover:text-ink active:bg-surface-hover disabled:text-ink-desabilitado disabled:hover:bg-transparent',
  secondary:
    'border border-line-fina bg-surface-painel text-ink-medio hover:border-faint hover:text-ink disabled:bg-surface-suave disabled:text-ink-desabilitado',
} as const;

export function IconButton({
  label,
  variant = 'quiet',
  density = 'padrao',
  shape = 'square',
  type = 'button',
  className,
  children,
  ...resto
}: IconButtonProps) {
  return (
    <button
      type={type}
      aria-label={label}
      className={cn(
        'inline-flex shrink-0 items-center justify-center outline-none',
        'duration-rapido ease-padrao transition-colors disabled:cursor-not-allowed',
        shape === 'circle' ? 'rounded-full' : 'rounded-controle',
        ALTURA[density],
        LARGURA[density],
        VARIANTE[variant],
        FOCO_DE_ACAO,
        className,
      )}
      {...resto}
    >
      {children}
    </button>
  );
}
