import type { ExposicaoDoPedido, NaturezaDaCobranca, PedidoDeVenda } from '@synapse/types';
import { semAcento } from './texto';

/** Valor comercial nao e exposicao de credito.
 *
 *  O valor comercial e o tamanho da operacao. A exposicao e quanto dela o
 *  cliente fica devendo — e so isso compromete o limite. Troca nao gera
 *  cobranca; PIX a vista entra antes de a mercadoria sair; no cartao quem deve
 *  e a operadora. Boleto, cheque e carteira sao credito de verdade, e mesmo
 *  assim so sobre o que nao foi pago de entrada.
 *
 *  E a unica implementacao dessa regra: a API calcula com ela e a tela recebe
 *  o resultado pronto. Uma condicional espalhada pela interface divergiria da
 *  API na primeira mudanca de politica. */

export type PedidoParaExposicao = Pick<
  PedidoDeVenda,
  | 'tipo'
  | 'formaDePagamento'
  | 'condicaoDePagamento'
  | 'vencimentosEmDias'
  | 'totalCentavos'
  | 'entradaCentavos'
>;

/** Tipos de pedido que nao geram titulo a receber. */
const TIPOS_SEM_COBRANCA = new Set(['BONIFICACAO', 'TROCA', 'AMOSTRA', 'DEVOLUCAO']);

/** Formas em que o dinheiro entra na hora — desde que a vista. */
const FORMAS_IMEDIATAS = new Set(['pix', 'dinheiro', 'especie', 'a vista em dinheiro']);

const FORMAS_SEM_COBRANCA = new Set(['bonificacao', 'troca', 'amostra', 'sem cobranca']);

const ehCartao = (forma: string): boolean => forma.includes('cartao');

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

const semCobrancaPelaCondicao = (pedido: PedidoParaExposicao): boolean =>
  semAcento(pedido.condicaoDePagamento).includes('sem cobranca') ||
  FORMAS_SEM_COBRANCA.has(semAcento(pedido.formaDePagamento));

export const naturezaDaCobranca = (pedido: PedidoParaExposicao): NaturezaDaCobranca => {
  if (TIPOS_SEM_COBRANCA.has(pedido.tipo) || semCobrancaPelaCondicao(pedido)) return 'SEM_COBRANCA';
  if (pedido.tipo === 'CONSIGNACAO') return 'CONSIGNACAO';
  const forma = semAcento(pedido.formaDePagamento);
  if (ehCartao(forma)) return 'CARTAO';
  const aVista = vencimentosDoPedido(pedido).every((dias) => dias === 0);
  if (FORMAS_IMEDIATAS.has(forma) && aVista) return 'IMEDIATA';
  return 'A_PRAZO';
};

/** Sem cobranca, o pedido nao gera parcela nem titulo. */
export const semCobranca = (pedido: PedidoParaExposicao): boolean =>
  naturezaDaCobranca(pedido) === 'SEM_COBRANCA';

const EXPLICACAO: Record<NaturezaDaCobranca, (pedido: PedidoParaExposicao) => string> = {
  SEM_COBRANCA: () => 'Sem cobrança: a operação não gera título a receber.',
  IMEDIATA: (pedido) =>
    `${pedido.formaDePagamento.trim() || 'Pagamento'} à vista: o valor é recebido antes da entrega, sem conceder crédito.`,
  CARTAO: () => 'Cartão: o recebível é contra a operadora, não contra o cliente.',
  A_PRAZO: (pedido) =>
    (pedido.entradaCentavos ?? 0) > 0
      ? 'A prazo: a exposição é o saldo financiado depois da entrada.'
      : `${pedido.formaDePagamento.trim() || 'A prazo'}: o cliente recebe agora e paga depois — todo o valor é crédito concedido.`,
  CONSIGNACAO: () =>
    'Consignação: a mercadoria fica em poder do cliente e é tratada como exposição integral até o acerto.',
};

export const exposicaoDoPedido = (pedido: PedidoParaExposicao): ExposicaoDoPedido => {
  const valorComercialCentavos = Math.max(0, pedido.totalCentavos);
  const natureza = naturezaDaCobranca(pedido);
  // Entrada maior que o pedido e erro de digitacao: vale no maximo o total.
  const entradaCentavos = Math.min(
    Math.max(0, pedido.entradaCentavos ?? 0),
    valorComercialCentavos,
  );
  const financiadoCentavos = valorComercialCentavos - entradaCentavos;
  const consomeLimite = natureza === 'A_PRAZO' || natureza === 'CONSIGNACAO';
  const exposicaoCentavos = consomeLimite ? financiadoCentavos : 0;

  return {
    valorComercialCentavos,
    entradaCentavos,
    financiadoCentavos: natureza === 'SEM_COBRANCA' ? 0 : financiadoCentavos,
    exposicaoCentavos,
    natureza,
    consomeLimite: consomeLimite && exposicaoCentavos > 0,
    explicacao: EXPLICACAO[natureza](pedido),
  };
};
