import { Caixa, Campo, Selecao, Texto } from '../../customers/campos';
import { lerCaminho, type ErrosDaFicha } from './caminho';

/** Campos ligados a um caminho da ficha ("endereco.cep"): leem o valor, mostram
 *  o aviso do schema e gravam de volta — cada aba só diz qual campo e onde. */

export interface LigacaoDaFicha {
  readonly formulario: unknown;
  readonly mudar: (caminho: string, valor: unknown) => void;
  readonly erros: ErrosDaFicha;
}

type Largura = 1 | 2 | 3 | 4 | 'tudo';

export function CampoTexto({
  ficha,
  caminho,
  rotulo,
  dica,
  largura,
  mascara,
  maxLength,
  placeholder,
  inputMode,
  type,
  disabled,
  maiusculas,
}: {
  readonly ficha: LigacaoDaFicha;
  readonly caminho: string;
  readonly rotulo: string;
  readonly dica?: string;
  readonly largura?: Largura;
  readonly mascara?: (valor: string) => string;
  readonly maxLength?: number;
  readonly placeholder?: string;
  readonly inputMode?: 'text' | 'numeric' | 'decimal' | 'tel' | 'email';
  readonly type?: 'text' | 'email' | 'date' | 'time';
  readonly disabled?: boolean;
  readonly maiusculas?: boolean;
}) {
  const bruto = lerCaminho(ficha.formulario, caminho);
  const valor = typeof bruto === 'string' ? bruto : bruto == null ? '' : String(bruto);
  return (
    <Campo rotulo={rotulo} dica={dica} erro={ficha.erros[caminho]} largura={largura}>
      {({ id, invalido }) => (
        <Texto
          id={id}
          invalido={invalido}
          valor={mascara ? mascara(valor) : valor}
          aoMudar={(novo) => {
            const tratado = mascara ? mascara(novo) : novo;
            ficha.mudar(caminho, maiusculas ? tratado.toLocaleUpperCase('pt-BR') : tratado);
          }}
          maxLength={maxLength}
          placeholder={placeholder}
          inputMode={inputMode}
          type={type === 'time' ? 'text' : type}
          disabled={disabled}
        />
      )}
    </Campo>
  );
}

export function CampoSelecao<T extends string>({
  ficha,
  caminho,
  rotulo,
  opcoes,
  largura,
  dica,
}: {
  readonly ficha: LigacaoDaFicha;
  readonly caminho: string;
  readonly rotulo: string;
  readonly opcoes: ReadonlyArray<readonly [T, string]>;
  readonly largura?: Largura;
  readonly dica?: string;
}) {
  const valor = (lerCaminho(ficha.formulario, caminho) ?? '') as T;
  return (
    <Campo rotulo={rotulo} dica={dica} erro={ficha.erros[caminho]} largura={largura}>
      {({ id, invalido }) => (
        <Selecao
          id={id}
          invalido={invalido}
          valor={valor}
          aoMudar={(novo) => ficha.mudar(caminho, novo)}
          opcoes={opcoes}
        />
      )}
    </Campo>
  );
}

export function CampoCaixa({
  ficha,
  caminho,
  rotulo,
  dica,
}: {
  readonly ficha: LigacaoDaFicha;
  readonly caminho: string;
  readonly rotulo: string;
  readonly dica?: string;
}) {
  return (
    <Caixa
      rotulo={rotulo}
      dica={dica}
      marcado={lerCaminho(ficha.formulario, caminho) === true}
      aoAlternar={(marcado) => ficha.mudar(caminho, marcado)}
    />
  );
}
