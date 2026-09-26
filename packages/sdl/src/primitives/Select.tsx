import type { ReactNode, Ref, SelectHTMLAttributes } from 'react';
import { cn } from '../lib/cn';
import { useControle } from './campo-contexto';
import { classeDeControle, TAMANHO_DE_ICONE, type Densidade } from './visual';

/** Seleção com a semântica nativa preservada.
 *
 *  Nada de dropdown inventado: `<select>` nativo ja traz teclado, busca por
 *  digitacao e a lista do sistema operacional, que no Windows do balcao e o que
 *  a pessoa conhece. O que o SDL faz e vestir o controle com a mesma geometria
 *  do `Input` e desenhar a seta — discreta, alinhada, sem circulo.
 *
 *  Combobox com busca e outro componente, de outra fase. */

export interface SelectProps extends Omit<SelectHTMLAttributes<HTMLSelectElement>, 'size'> {
  readonly density?: Densidade;
  readonly invalid?: boolean;
  readonly children: ReactNode;
  readonly ref?: Ref<HTMLSelectElement>;
}

export function Select({ density, invalid, className, children, ...resto }: SelectProps) {
  const controle = useControle({
    id: resto.id,
    density,
    invalid,
    disabled: resto.disabled,
    describedBy: resto['aria-describedby'],
  });
  const lado = TAMANHO_DE_ICONE[controle.densidade];

  return (
    <div className="relative">
      <select
        {...resto}
        id={controle.id}
        disabled={controle.desabilitado}
        {...controle.aria}
        className={cn(
          classeDeControle(controle.densidade, controle.invalido),
          'cursor-pointer appearance-none pr-9 disabled:cursor-not-allowed',
          className,
        )}
      >
        {children}
      </select>
      <svg
        aria-hidden="true"
        viewBox="0 0 16 16"
        width={lado}
        height={lado}
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        className="text-ink-sutil pointer-events-none absolute right-3 top-1/2 -translate-y-1/2"
      >
        <path d="m4 6 4 4 4-4" />
      </svg>
    </div>
  );
}
