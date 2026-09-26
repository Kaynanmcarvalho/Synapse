import { cn } from '../lib/cn';
import { Input, type InputProps } from './Input';

/** Documento e afins: CPF, CNPJ, CEP, telefone, inscricao.
 *
 *  O que este componente resolve e a repeticao: todo campo desses precisa de
 *  teclado numerico, algarismo de largura fixa e da mesma ligacao entre digitar
 *  e aplicar a mascara. O que ele **nao** faz e conhecer as regras brasileiras —
 *  a mascara chega de fora (`format`), das funcoes que o app ja tem e testa, e a
 *  validacao continua no schema compartilhado com a API.
 *
 *  Sem `format`, e um `Input` numerico comum com `value`/`onChange` nativos. */

export interface DocInputProps extends Omit<InputProps, 'align' | 'type' | 'value'> {
  readonly value: string;
  /** Mascara do proprio dominio: `mascararDocumento`, `mascararCep`, … */
  readonly format?: (valor: string) => string;
  /** Recebe o valor ja mascarado. */
  readonly onValueChange?: (valor: string) => void;
}

export function DocInput({
  value,
  format,
  onValueChange,
  onChange,
  className,
  inputMode = 'numeric',
  ...resto
}: DocInputProps) {
  return (
    <Input
      value={format ? format(value) : value}
      inputMode={inputMode}
      className={cn('font-data', className)}
      onChange={(evento) => {
        const digitado = evento.target.value;
        onValueChange?.(format ? format(digitado) : digitado);
        onChange?.(evento);
      }}
      {...resto}
    />
  );
}
