import { cn } from '../lib/cn';
import { Input, type InputProps } from './Input';
import { useCampo } from './campo-contexto';
import { RECUO_LATERAL } from './visual';

/** Valor em real.
 *
 *  Apresentacao e entrada, nada de regra financeira: o `R$` fica fixo na
 *  esquerda, o numero alinha a direita com algarismos de largura fixa e o
 *  teclado abre no modo decimal. A conversao entre o que se digita e os centavos
 *  que o sistema guarda continua onde sempre esteve, no dominio de quem usa o
 *  campo — este componente nunca arredonda nem reinterpreta valor. */

export type MoneyInputProps = Omit<InputProps, 'type' | 'align'>;

export function MoneyInput({ className, density, ...resto }: MoneyInputProps) {
  const campo = useCampo();
  const densidade = density ?? campo?.density ?? 'padrao';

  return (
    <div className="relative">
      <span
        aria-hidden="true"
        className={cn(
          'text-ink-sutil text-body-sm pointer-events-none absolute inset-y-0 flex items-center',
          RECUO_LATERAL[densidade],
        )}
      >
        R$
      </span>
      <Input
        align="right"
        inputMode="decimal"
        density={densidade}
        className={cn('pl-10', className)}
        {...resto}
      />
    </div>
  );
}
