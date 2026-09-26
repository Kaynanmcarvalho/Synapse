import { Input, type InputProps } from './Input';

/** Quantidade, percentual, dias.
 *
 *  So uma especializacao do `Input`: alinhado a direita, com algarismos de
 *  largura fixa e teclado numerico. Sem botoes de mais e menos — o balcao digita
 *  o numero, e nenhum fluxo do Synapse usa passo por clique. */

export type NumberInputProps = Omit<InputProps, 'type' | 'align'>;

export function NumberInput({ inputMode = 'decimal', ...resto }: NumberInputProps) {
  return <Input type="number" align="right" inputMode={inputMode} {...resto} />;
}
