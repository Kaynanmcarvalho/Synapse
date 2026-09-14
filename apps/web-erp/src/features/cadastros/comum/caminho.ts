/** Ler e trocar um campo aninhado da ficha pelo caminho ("endereco.cep"), sem
 *  mutar o objeto — o formulário compara o antes e o depois para saber se mudou. */

type Objeto = Record<string, unknown>;

export const lerCaminho = (objeto: unknown, caminho: string): unknown =>
  caminho
    .split('.')
    .reduce<unknown>(
      (atual, parte) => (atual && typeof atual === 'object' ? (atual as Objeto)[parte] : undefined),
      objeto,
    );

export const definirCaminho = <T>(objeto: T, caminho: string, valor: unknown): T => {
  const [parte, ...resto] = caminho.split('.');
  if (!parte) return objeto;
  const atual = (objeto ?? {}) as Objeto;
  return {
    ...atual,
    [parte]: resto.length ? definirCaminho(atual[parte], resto.join('.'), valor) : valor,
  } as T;
};

export type ErrosDaFicha = Readonly<Record<string, string | undefined>>;

/** As mensagens do schema, uma por campo (a primeira vence). */
export const errosDoSchema = (
  issues: readonly { readonly path: readonly PropertyKey[]; readonly message: string }[],
): ErrosDaFicha => {
  const erros: Record<string, string> = {};
  for (const issue of issues) {
    const chave = issue.path.map(String).join('.');
    if (chave && !erros[chave]) erros[chave] = issue.message;
  }
  return erros;
};

/** A primeira aba com campo para corrigir, na ordem das abas. */
export const abaComErro = <A extends string>(
  erros: ErrosDaFicha,
  abaDoCampo: (campo: string) => A,
  ordem: readonly A[],
): A | null => {
  const comErro = new Set(
    Object.entries(erros)
      .filter(([, mensagem]) => Boolean(mensagem))
      .map(([campo]) => abaDoCampo(campo)),
  );
  return ordem.find((aba) => comErro.has(aba)) ?? null;
};
