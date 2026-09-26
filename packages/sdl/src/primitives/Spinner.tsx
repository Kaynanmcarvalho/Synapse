import { cn } from '../lib/cn';

/** Espera, sem espetaculo.
 *
 *  Herda `currentColor`, entao funciona igual dentro de um botao escuro e de um
 *  paragrafo cinza. Quando representa o carregamento de um trecho da tela, se
 *  anuncia com `role="status"`; quando esta dentro de um botao que ja diz
 *  "Salvando…", fica decorativo para o leitor de tela nao repetir. */

export interface SpinnerProps {
  readonly size?: number;
  /** Dentro de um botao ou ao lado de um texto que ja explica a espera. */
  readonly decorative?: boolean;
  readonly label?: string;
  readonly className?: string;
}

export function Spinner({
  size = 16,
  decorative = false,
  label = 'Carregando',
  className,
}: SpinnerProps) {
  return (
    <svg
      viewBox="0 0 16 16"
      width={size}
      height={size}
      fill="none"
      aria-hidden={decorative || undefined}
      role={decorative ? undefined : 'status'}
      aria-label={decorative ? undefined : label}
      className={cn('animate-spin motion-reduce:animate-none', className)}
    >
      <circle cx="8" cy="8" r="6.5" stroke="currentColor" strokeOpacity="0.25" strokeWidth="1.5" />
      <path
        d="M14.5 8A6.5 6.5 0 0 0 8 1.5"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
    </svg>
  );
}
