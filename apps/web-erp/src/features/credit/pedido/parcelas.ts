import type { CarteiraDoCliente, PedidoDeVenda } from '@synapse/types';

/** Calendario das parcelas de um pedido: em que dia cai cada uma, contando de
 *  hoje, e quanto vale. E a conta que o analista faz de cabeca para saber se o
 *  cliente aguenta o parcelamento — aqui ela fica escrita. */

export interface Parcela {
  readonly numero: number;
  readonly dias: number;
  /** AAAA-MM-DD no dia local. */
  readonly vencimento: string;
  readonly valorCentavos: number;
}

const TIPOS_SEM_COBRANCA = new Set(['BONIFICACAO', 'TROCA', 'AMOSTRA']);

const semAcento = (valor: string): string =>
  valor.normalize('NFD').replace(/\p{M}/gu, '').toLowerCase();

/** Bonificacao, troca e amostra nao geram cobranca: nao ha parcela a analisar. */
export const semCobranca = (pedido: Pick<PedidoDeVenda, 'tipo' | 'condicaoDePagamento'>) =>
  TIPOS_SEM_COBRANCA.has(pedido.tipo) ||
  semAcento(pedido.condicaoDePagamento).includes('sem cobranca');

/** Os dias de cada vencimento. Pedido novo ja traz os dias; o antigo so tinha a
 *  condicao em texto, entao ela e lida: "14/21/28/35", "Cheque 14/21", "3x". */
export const vencimentosDoPedido = (
  pedido: Pick<PedidoDeVenda, 'vencimentosEmDias' | 'condicaoDePagamento'>,
): readonly number[] => {
  const gravados = pedido.vencimentosEmDias ?? [];
  if (gravados.length > 0) return [...gravados].sort((a, b) => a - b);

  const condicao = semAcento(pedido.condicaoDePagamento);
  const vezes = /(\d+)\s*x/.exec(condicao);
  if (vezes) return Array.from({ length: Number(vezes[1]) }, (_, indice) => 30 * (indice + 1));

  const numeros = condicao.match(/\d+/g)?.map(Number) ?? [];
  return numeros.length > 0 ? numeros.sort((a, b) => a - b) : [0];
};

/** "14/21/28/35" para mostrar o parcelamento como o balcao fala. */
export const descricaoDoParcelamento = (dias: readonly number[]): string =>
  dias.length === 1 && dias[0] === 0 ? 'À vista' : dias.join('/');

const diaLocal = (data: Date): string => {
  const mes = `${data.getMonth() + 1}`.padStart(2, '0');
  const dia = `${data.getDate()}`.padStart(2, '0');
  return `${data.getFullYear()}-${mes}-${dia}`;
};

/** Parcelas contadas a partir de `hoje`. O centavo que sobra da divisao fica na
 *  primeira parcela — e o costume do boleto, e a soma sempre fecha o total. */
export const parcelasDoPedido = (
  pedido: Pick<
    PedidoDeVenda,
    'vencimentosEmDias' | 'condicaoDePagamento' | 'totalCentavos' | 'tipo'
  >,
  hoje: Date,
): readonly Parcela[] => {
  if (semCobranca(pedido)) return [];
  const dias = vencimentosDoPedido(pedido);
  const base = Math.floor(pedido.totalCentavos / dias.length);
  const sobra = pedido.totalCentavos - base * dias.length;

  return dias.map((prazo, indice) => {
    const vencimento = new Date(hoje.getFullYear(), hoje.getMonth(), hoje.getDate() + prazo);
    return {
      numero: indice + 1,
      dias: prazo,
      vencimento: diaLocal(vencimento),
      valorCentavos: base + (indice === 0 ? sobra : 0),
    };
  });
};

const media = (valores: readonly number[]): number | null =>
  valores.length === 0 ? null : Math.round(valores.reduce((a, b) => a + b, 0) / valores.length);

/** O que o cliente costuma pagar e o que ja deve por parcela: a regua para ver
 *  se o parcelamento novo cabe no bolso dele. */
export const referenciasDoCliente = (carteira: CarteiraDoCliente) => ({
  mediaPagaCentavos: media(carteira.pagamentos.map((pagamento) => pagamento.valorCentavos)),
  mediaEmAbertoCentavos: media(carteira.titulosEmAberto.map((titulo) => titulo.saldoCentavos)),
});

/** Quanto a parcela passa (ou fica abaixo) da media, em pontos percentuais. */
export const diferencaParaMedia = (valorCentavos: number, mediaCentavos: number | null) =>
  mediaCentavos === null || mediaCentavos === 0
    ? null
    : Math.round(((valorCentavos - mediaCentavos) / mediaCentavos) * 100);
