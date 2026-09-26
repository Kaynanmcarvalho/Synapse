import { createContext, useContext } from 'react';
import type { Densidade } from './visual';

/** O que o `Field` resolve e os controles herdam: id, estado de aviso, quem
 *  descreve o campo para o leitor de tela, densidade e desabilitado.
 *
 *  Sem isto, cada tela repetiria `id`, `aria-describedby` e `aria-invalid` a
 *  mao — e a acessibilidade viraria opcional na pressa. */
export interface ContextoDoCampo {
  readonly id: string;
  readonly invalid: boolean;
  readonly describedBy: string | undefined;
  readonly density: Densidade;
  readonly required: boolean;
  readonly disabled: boolean;
}

export const CampoContexto = createContext<ContextoDoCampo | null>(null);

/** Controle dentro de um `Field` herda o contexto; fora dele, funciona sozinho. */
export const useCampo = (): ContextoDoCampo | null => useContext(CampoContexto);

interface PropsDoControle {
  readonly id?: string | undefined;
  readonly density?: Densidade | undefined;
  readonly invalid?: boolean | undefined;
  readonly disabled?: boolean | undefined;
  readonly describedBy?: string | undefined;
}

export interface ControleResolvido {
  readonly id: string | undefined;
  readonly densidade: Densidade;
  readonly invalido: boolean;
  readonly desabilitado: boolean | undefined;
  /** Os atributos de acessibilidade ja prontos para espalhar no elemento. */
  readonly aria: Record<string, string | boolean>;
}

/** Junta o que a prop diz com o que o `Field` ao redor sabe. Fica aqui, e nao
 *  dentro de cada controle, para Input e Select nao repetirem a mesma cadeia de
 *  heranca — e para o proximo controle nascer certo de graca. */
const montarAria = (
  invalido: boolean,
  descricao: string | undefined,
  obrigatorio: boolean,
): Record<string, string | boolean> => {
  const aria: Record<string, string | boolean> = {};
  if (invalido) aria['aria-invalid'] = true;
  if (descricao) aria['aria-describedby'] = descricao;
  if (obrigatorio) aria['aria-required'] = true;
  return aria;
};

export const useControle = (props: PropsDoControle): ControleResolvido => {
  const campo = useContext(CampoContexto);
  const invalido = props.invalid ?? campo?.invalid ?? false;
  const descricao = props.describedBy ?? campo?.describedBy;
  return {
    id: props.id ?? campo?.id,
    densidade: props.density ?? campo?.density ?? 'padrao',
    invalido,
    desabilitado: props.disabled ?? campo?.disabled,
    aria: montarAria(invalido, descricao, campo?.required === true),
  };
};
