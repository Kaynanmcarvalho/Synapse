import type { InputHTMLAttributes, Ref } from 'react';
import { cn } from '../lib/cn';
import { useControle } from './campo-contexto';
import { classeDeControle, type Densidade } from './visual';

/** O campo de texto do Synapse.
 *
 *  Geometria precisa: 36px de altura no padrao, raio de controle, linha fina,
 *  superficie levemente afundada e nenhuma sombra. O foco troca a borda para
 *  cobalto e abre um halo curto — da para ver de longe onde esta o cursor sem o
 *  anel grosso das bibliotecas.
 *
 *  Dentro de um `Field`, herda id, aviso, densidade e `aria-describedby`. */

export interface InputProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'size'> {
  readonly density?: Densidade;
  readonly invalid?: boolean;
  /** Numero e valor alinham a direita; texto, a esquerda. */
  readonly align?: 'left' | 'right';
  readonly ref?: Ref<HTMLInputElement>;
}

export function Input({ density, invalid, align = 'left', className, ...resto }: InputProps) {
  const controle = useControle({
    id: resto.id,
    density,
    invalid,
    disabled: resto.disabled,
    describedBy: resto['aria-describedby'],
  });

  return (
    <input
      {...resto}
      id={controle.id}
      disabled={controle.desabilitado}
      {...controle.aria}
      className={cn(
        classeDeControle(controle.densidade, controle.invalido),
        align === 'right' && 'font-data text-right',
        className,
      )}
    />
  );
}
