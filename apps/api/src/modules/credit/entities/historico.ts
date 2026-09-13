import type {
  EtapaDoPedido,
  EventoDoPedido,
  ObservacaoDoPedido,
  PedidoDeVenda,
  SituacaoDoPedido,
  TipoDeEvento,
} from '@synapse/types';

/** Rastro do pedido: cada acao acrescenta um evento e nada e apagado. Puro, sem
 *  I/O — o repositorio so grava o que sai daqui. */

export interface Ator {
  readonly uid: string;
  readonly nome: string;
}

export const evento = (
  tipo: TipoDeEvento,
  etapa: EtapaDoPedido,
  ator: Ator,
  em: string,
  detalhe: string | null = null,
): EventoDoPedido => ({ tipo, etapa, em, porUid: ator.uid, porNome: ator.nome, detalhe });

const SITUACAO_POR_EXTENSO: Record<SituacaoDoPedido, string> = {
  AGUARDANDO_ANALISE: 'aguardando análise',
  APROVADO: 'liberado',
  REPROVADO: 'reprovado',
  FATURADO: 'faturado',
  CANCELADO: 'cancelado',
};

/** Por que o pedido nao pode ser liberado agora — ou nulo, se pode. Pedido ja
 *  liberado nao e liberado de novo: dois analistas clicando juntos nao geram
 *  dois eventos nem pulam a fila do faturamento. */
export const motivoParaNaoLiberar = (pedido: PedidoDeVenda | null): string | null => {
  if (!pedido) return 'Pedido não encontrado';
  if (pedido.situacao !== 'AGUARDANDO_ANALISE')
    return `Pedido ${pedido.numero} já está ${SITUACAO_POR_EXTENSO[pedido.situacao]}`;
  return null;
};

/** Liberado no credito, o pedido segue para o faturamento. */
export const liberarPedido = (pedido: PedidoDeVenda, ator: Ator, em: string): PedidoDeVenda => ({
  ...pedido,
  situacao: 'APROVADO',
  analisadoEm: em,
  analisadoPor: ator.uid as PedidoDeVenda['analisadoPor'],
  historico: [
    ...(pedido.historico ?? []),
    evento(
      'LIBERADO',
      'CREDITO',
      ator,
      em,
      'Liberado na análise de crédito — segue para o faturamento',
    ),
  ],
});

/** Observacao entra na lista e deixa rastro no historico, com a etapa em que foi
 *  escrita: e o que diz se quem falou foi o vendedor, o credito ou a expedicao. */
export const observarPedido = (
  pedido: PedidoDeVenda,
  observacao: ObservacaoDoPedido,
): PedidoDeVenda => ({
  ...pedido,
  observacoes: [...(pedido.observacoes ?? []), observacao],
  historico: [
    ...(pedido.historico ?? []),
    evento(
      'OBSERVACAO',
      observacao.etapa,
      { uid: observacao.porUid, nome: observacao.porNome },
      observacao.em,
      observacao.texto.length > 140 ? `${observacao.texto.slice(0, 137)}…` : observacao.texto,
    ),
  ],
});

/** Marca de impressao tambem e rastro: saber quem imprimiu e quando evita o
 *  "achei que ja tinham separado". Desmarcar nao gera evento. */
export const registrarImpressao = (
  pedido: PedidoDeVenda,
  ator: Ator,
  em: string,
  impresso: boolean,
): PedidoDeVenda => {
  const marcas = new Set(pedido.impressoPor ?? []);
  if (impresso) marcas.add(ator.uid as PedidoDeVenda['impressoPor'][number]);
  else marcas.delete(ator.uid as PedidoDeVenda['impressoPor'][number]);
  return {
    ...pedido,
    impressoPor: [...marcas],
    historico: impresso
      ? [...(pedido.historico ?? []), evento('IMPRESSO', 'CREDITO', ator, em)]
      : (pedido.historico ?? []),
  };
};
