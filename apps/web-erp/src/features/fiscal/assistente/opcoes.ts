/** Opções de seleção do assistente. `<select>` só fala texto; a opção
 *  escolhida volta com o tipo dela (o CRT é número, por exemplo) — o mesmo
 *  mapeamento que a antiga `Selecao` fazia. */
export interface Opcao<T> {
  readonly valor: T;
  readonly rotulo: string;
}

export const opcaoEscolhida = <T extends string | number>(
  opcoes: ReadonlyArray<Opcao<T>>,
  texto: string,
): T | undefined => opcoes.find((opcao) => String(opcao.valor) === texto)?.valor;
