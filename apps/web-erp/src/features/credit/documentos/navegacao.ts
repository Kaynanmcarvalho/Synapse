/** Navegacao entre documentos numa janela so.
 *
 *  Pedido, nota e titulo se apontam entre si (Pedido 95 > NF 4388 > Título
 *  4388/1). Abrir cada um numa janela nova empilharia modais sem fim; aqui a
 *  janela guarda o caminho, mostra o breadcrumb e volta um passo. Abrir pela
 *  lupa comeca um caminho novo; seguir um vinculo acrescenta ao caminho — e
 *  voltar a um documento que ja esta no caminho corta o que vinha depois, em
 *  vez de dar voltas. */

export type VisaoDoTitulo = 'aberto' | 'pago';

export type Documento =
  | { readonly tipo: 'pedido'; readonly id: string; readonly rotulo: string }
  | { readonly tipo: 'nota'; readonly id: string; readonly rotulo: string }
  | {
      readonly tipo: 'titulo';
      readonly id: string;
      readonly rotulo: string;
      /** Titulo a receber ou titulo pago: o mesmo dado, perguntas diferentes. */
      readonly visao?: VisaoDoTitulo;
    };

/** Mais que isto e sinal de que o analista se perdeu: o comeco do caminho sai. */
export const PROFUNDIDADE_MAXIMA = 6;

const mesmo = (a: Documento, b: Documento): boolean => a.tipo === b.tipo && a.id === b.id;

export const abrirPelaLupa = (documento: Documento): readonly Documento[] => [documento];

export const seguirVinculo = (
  caminho: readonly Documento[],
  documento: Documento,
): readonly Documento[] => {
  const posicao = caminho.findIndex((item) => mesmo(item, documento));
  if (posicao >= 0) return caminho.slice(0, posicao + 1);
  return [...caminho, documento].slice(-PROFUNDIDADE_MAXIMA);
};

export const voltar = (caminho: readonly Documento[]): readonly Documento[] =>
  caminho.length > 1 ? caminho.slice(0, -1) : caminho;

export const irPara = (caminho: readonly Documento[], indice: number): readonly Documento[] =>
  indice >= 0 && indice < caminho.length ? caminho.slice(0, indice + 1) : caminho;

/** Chave de cache de um documento carregado. */
export const chaveDoDocumento = (documento: Documento): string =>
  `${documento.tipo}:${documento.id}`;

// ── De onde cada lupa leva ──────────────────────────────────────────────────

export const documentoDoPedido = (pedido: { id: string; numero: number }): Documento => ({
  tipo: 'pedido',
  id: pedido.id,
  rotulo: `Pedido ${pedido.numero}`,
});

export const documentoDaNota = (nota: { pedidoId: string; numero: number }): Documento => ({
  tipo: 'nota',
  id: nota.pedidoId,
  rotulo: `NF ${nota.numero}`,
});

export const documentoDoTitulo = (
  titulo: { id: string; numero: string; parcela: string },
  visao?: VisaoDoTitulo,
): Documento => ({
  tipo: 'titulo',
  id: titulo.id,
  rotulo: `Título ${titulo.numero} · ${titulo.parcela}`,
  ...(visao ? { visao } : {}),
});
