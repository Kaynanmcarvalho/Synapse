import { Campo, Texto, type PropsDoTexto } from '../campos';
import type { FormularioDoCliente } from '../formulario';
import type { PropsDaAba } from './aba';

/** Campo de texto já ligado ao formulário: valor, erro e máscara num lugar só.
 *  Sem isto, cada campo da ficha repetia as mesmas doze linhas — e campo
 *  repetido é campo que alguém esquece de ligar ao erro. */

/** Só os campos de texto livre (os de lista fechada usam seleção). */
type CampoTextual = {
  [C in keyof FormularioDoCliente]: string extends FormularioDoCliente[C] ? C : never;
}[keyof FormularioDoCliente];

export function CampoDeTexto({
  aba,
  campo,
  rotulo,
  dica,
  largura,
  mascara,
  ...controle
}: Omit<PropsDoTexto, 'valor' | 'aoMudar' | 'id' | 'invalido'> & {
  readonly aba: Pick<PropsDaAba, 'formulario' | 'mudar' | 'erros'>;
  readonly campo: CampoTextual;
  readonly rotulo: string;
  readonly dica?: string | undefined;
  readonly largura?: 1 | 2 | 3 | 4 | 'tudo' | undefined;
  readonly mascara?: ((valor: string) => string) | undefined;
}) {
  return (
    <Campo rotulo={rotulo} dica={dica} largura={largura} erro={aba.erros[campo] ?? null}>
      {({ id, invalido }) => (
        <Texto
          {...controle}
          id={id}
          invalido={invalido}
          valor={aba.formulario[campo]}
          aoMudar={(valor) => aba.mudar(campo, mascara ? mascara(valor) : valor)}
        />
      )}
    </Campo>
  );
}
