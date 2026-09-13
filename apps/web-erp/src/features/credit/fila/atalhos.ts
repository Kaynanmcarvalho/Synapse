import type { PedidoNaFila } from '@synapse/types';

/** Atalhos da barra da fila e os totais do rodape: os dois leem o mesmo
 *  recorte, entao a contagem e os totais nunca discordam do que esta na tela. */

export type Atalho =
  'todos' | 'fora-da-politica' | 'nao-impressos' | 'com-atraso' | 'sem-titulo' | 'nao-venda';

export const ATALHOS: ReadonlyArray<{ readonly id: Atalho; readonly rotulo: string }> = [
  { id: 'todos', rotulo: 'Todos' },
  { id: 'fora-da-politica', rotulo: 'Fora da política' },
  { id: 'nao-impressos', rotulo: 'Não impressos' },
  { id: 'com-atraso', rotulo: 'Com atraso' },
  { id: 'sem-titulo', rotulo: 'Sem dívida' },
  { id: 'nao-venda', rotulo: 'Bonificação e troca' },
];

export const aplicarAtalho = (
  linhas: readonly PedidoNaFila[],
  atalho: Atalho,
): readonly PedidoNaFila[] => {
  if (atalho === 'fora-da-politica') return linhas.filter((linha) => linha.avaliacao.violaPolitica);
  if (atalho === 'com-atraso') return linhas.filter((linha) => linha.cliente.titulosVencidos > 0);
  if (atalho === 'sem-titulo')
    return linhas.filter(
      (linha) => linha.cliente.vencidoCentavos + linha.cliente.aVencerCentavos === 0,
    );
  if (atalho === 'nao-venda') return linhas.filter((linha) => linha.pedido.tipo !== 'VENDA');
  if (atalho === 'nao-impressos') return linhas.filter((linha) => !linha.impresso);
  return linhas;
};

export interface TotaisDaFila {
  readonly pedidos: number;
  readonly valorCentavos: number;
  readonly exposicaoCentavos: number;
  readonly vencidoCentavos: number;
  readonly clientes: number;
}

export const totaisDaFila = (linhas: readonly PedidoNaFila[]): TotaisDaFila => ({
  pedidos: linhas.length,
  valorCentavos: linhas.reduce((soma, linha) => soma + linha.pedido.totalCentavos, 0),
  exposicaoCentavos: linhas.reduce(
    (soma, linha) => soma + linha.avaliacao.exposicao.exposicaoCentavos,
    0,
  ),
  // Divida vencida conta uma vez por cliente, e nao uma vez por pedido.
  vencidoCentavos: [
    ...new Map(linhas.map((linha) => [linha.pedido.customerId, linha.cliente])).values(),
  ].reduce((soma, cliente) => soma + cliente.vencidoCentavos, 0),
  clientes: new Set(linhas.map((linha) => linha.pedido.customerId)).size,
});
