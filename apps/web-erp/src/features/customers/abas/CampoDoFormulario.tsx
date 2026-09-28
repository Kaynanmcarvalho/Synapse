import { Field, Input, MoneyInput, type LarguraDoCampo } from '@synapse/sdl';
import { useId } from 'react';
import { LARGURA_DE_CAMPO, type LarguraDeCampo } from '../../../components/formulario/larguras';
import type { PropsDoTexto } from '../campos';
import type { FormularioDoCliente } from '../formulario';
import type { PropsDaAba } from './aba';

/** Campo de texto já ligado ao formulário: valor, erro e máscara num lugar só.
 *  Sem isto, cada campo da ficha repetia as mesmas doze linhas — e campo
 *  repetido é campo que alguém esquece de ligar ao erro.
 *
 *  Fase 6.1: passou a renderizar com `Field`/`Input` do SDL em vez do kit
 *  local `campos.tsx` — mesma API para quem já chama `CampoDeTexto`, controle
 *  de 36px por baixo. `largura` aceita `1|2|3|4|'tudo'` (o span do kit local)
 *  para não obrigar todo consumidor a migrar no mesmo commit.
 *
 *  Fase 6.2: `moeda` troca o `Input` por `MoneyInput` (prefixo "R$", alinhado
 *  à direita, teclado decimal) — primeiro uso real do primitive. O valor
 *  continua string comum (`lerMoeda`/`escreverMoeda` seguem convertendo para
 *  centavos como sempre); isto só troca a apresentação. */

/** Só os campos de texto livre (os de lista fechada usam seleção). */
type CampoTextual = {
  [C in keyof FormularioDoCliente]: string extends FormularioDoCliente[C] ? C : never;
}[keyof FormularioDoCliente];

const SPAN_DO_SDL: Record<1 | 2 | 3 | 4 | 'tudo', LarguraDoCampo> = {
  1: 1,
  2: 2,
  3: 3,
  4: 4,
  tudo: 'full',
};

export function CampoDeTexto({
  aba,
  campo,
  rotulo,
  dica,
  largura = 1,
  larguraSemantica,
  mascara,
  obrigatorio = false,
  sugestoes,
  listaId,
  alinharADireita = false,
  moeda = false,
  ...controle
}: Omit<PropsDoTexto, 'valor' | 'aoMudar' | 'id' | 'invalido'> & {
  readonly aba: Pick<PropsDaAba, 'formulario' | 'mudar' | 'erros'>;
  readonly campo: CampoTextual;
  readonly rotulo: string;
  readonly dica?: string | undefined;
  /** Span de grade (kit antigo, `campos.tsx`/`Grade`). Ignorado quando
   *  `larguraSemantica` é passado. */
  readonly largura?: 1 | 2 | 3 | 4 | 'tudo' | undefined;
  /** Largura pela forma do dado (`components/formulario/larguras.ts`), para
   *  uso dentro de `LinhaDeCampos` — a Form Grammar da Fase 6. */
  readonly larguraSemantica?: LarguraDeCampo | undefined;
  readonly mascara?: ((valor: string) => string) | undefined;
  readonly obrigatorio?: boolean | undefined;
  /** Renderiza como `MoneyInput` em vez de `Input` — ignora `alinharADireita`
   *  e `inputMode`, que o `MoneyInput` já fixa por conta própria. */
  readonly moeda?: boolean | undefined;
}) {
  const idDaLista = useId();
  const lista = sugestoes?.length ? (listaId ?? idDaLista) : undefined;
  const erro = aba.erros[campo] ?? null;
  const aoMudarValor = (evento: { target: { value: string } }) => {
    const valor = evento.target.value;
    aba.mudar(campo, mascara ? mascara(valor) : valor);
  };
  return (
    <Field
      label={rotulo}
      hint={dica}
      error={erro}
      required={obrigatorio}
      span={larguraSemantica ? 1 : SPAN_DO_SDL[largura]}
      className={larguraSemantica ? LARGURA_DE_CAMPO[larguraSemantica] : undefined}
    >
      {moeda ? (
        <MoneyInput {...controle} value={aba.formulario[campo]} onChange={aoMudarValor} />
      ) : (
        <Input
          {...controle}
          list={lista}
          align={alinharADireita ? 'right' : 'left'}
          value={aba.formulario[campo]}
          onChange={aoMudarValor}
        />
      )}
      {lista && sugestoes ? (
        <datalist id={lista}>
          {sugestoes.map((sugestao) => (
            <option key={sugestao} value={sugestao} />
          ))}
        </datalist>
      ) : null}
    </Field>
  );
}
