import type { ExposicaoDoPedido, NaturezaDaCobranca, PedidoDeVenda } from '@synapse/types';
import { classeDaOperacao } from './operacao';
import { semAcento } from './texto';

/** Valor comercial nao e exposicao de credito.
 *
 *  O valor comercial e o tamanho da operacao. A exposicao e quanto dela
 *  compromete o limite do cliente. Troca nao gera cobranca; PIX e dinheiro a
 *  vista nao concedem prazo; no cartao o recebivel e contra a operadora. Boleto,
 *  cheque e carteira sao credito de verdade, e mesmo assim so sobre o que nao
 *  foi pago de entrada.
 *
 *  Exposicao zero NAO quer dizer "pago". Quer dizer "nao consome limite". O
 *  pedido de venda nao guarda se o PIX foi recebido nem se o cartao foi
 *  autorizado — por isso nada aqui fala em pagamento confirmado.
 *
 *  E a unica implementacao dessa regra: a API calcula com ela e a tela recebe
 *  o resultado pronto. */

export type PedidoParaExposicao = Pick<
  PedidoDeVenda,
  | 'tipo'
  | 'formaDePagamento'
  | 'condicaoDePagamento'
  | 'vencimentosEmDias'
  | 'totalCentavos'
  | 'entradaCentavos'
>;

/** Formas sem prazo concedido — desde que a vista. */
const FORMAS_IMEDIATAS = new Set(['pix', 'dinheiro', 'especie', 'a vista em dinheiro']);

const FORMAS_SEM_COBRANCA = new Set(['bonificacao', 'troca', 'amostra', 'sem cobranca']);

/** O pedido so tem a forma escolhida pelo vendedor, em texto. Nao ha estado de
 *  autorizacao, captura, recusa ou cancelamento da transacao de cartao no
 *  Synapse: a regra parte da premissa de que a venda no cartao sera autorizada. */
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
  const classe = classeDaOperacao(pedido.tipo);
  if (classe === 'SEM_COBRANCA' || semCobrancaPelaCondicao(pedido)) return 'SEM_COBRANCA';
  if (classe === 'CONSIGNACAO') return 'CONSIGNACAO';
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
    `${pedido.formaDePagamento.trim() || 'Pagamento'} à vista: não há prazo concedido ao cliente. ` +
    'O pedido não registra se o pagamento já foi recebido.',
  CARTAO: () =>
    'Cartão: o recebível é contra a operadora, não contra o cliente. ' +
    'O pedido não registra a autorização da transação.',
  A_PRAZO: (pedido) =>
    (pedido.entradaCentavos ?? 0) > 0
      ? 'A prazo: a exposição é o saldo financiado depois da entrada.'
      : `${pedido.formaDePagamento.trim() || 'A prazo'}: o cliente recebe agora e paga depois — todo o valor é crédito concedido.`,
  CONSIGNACAO: () =>
    'Consignação: a mercadoria fica sob responsabilidade do cliente. Por regra conservadora e ' +
    'provisória, o valor integral compromete o limite até o acerto.',
};

/** Quanto o pedido compromete, separado pela origem do risco.
 *
 *  - exposicaoCreditoCentavos: credito concedido ao cliente (a prazo).
 *  - exposicaoConsignacaoCentavos: mercadoria consignada — risco economico,
 *    ainda sem titulo a receber. Nesta versao compromete o limite por inteiro,
 *    por regra conservadora e provisoria.
 *  - exposicaoCentavos: o total consolidado, o que entra no comprometimento. */
export const exposicaoDoPedido = (pedido: PedidoParaExposicao): ExposicaoDoPedido => {
  const valorComercialCentavos = Math.max(0, pedido.totalCentavos);
  const natureza = naturezaDaCobranca(pedido);
  // Entrada maior que o pedido e erro de digitacao: vale no maximo o total.
  const entradaCentavos = Math.min(
    Math.max(0, pedido.entradaCentavos ?? 0),
    valorComercialCentavos,
  );
  const financiadoCentavos = valorComercialCentavos - entradaCentavos;
  const exposicaoCreditoCentavos = natureza === 'A_PRAZO' ? financiadoCentavos : 0;
  const exposicaoConsignacaoCentavos = natureza === 'CONSIGNACAO' ? financiadoCentavos : 0;
  const exposicaoCentavos = exposicaoCreditoCentavos + exposicaoConsignacaoCentavos;

  return {
    valorComercialCentavos,
    entradaCentavos,
    financiadoCentavos: natureza === 'SEM_COBRANCA' ? 0 : financiadoCentavos,
    exposicaoCreditoCentavos,
    exposicaoConsignacaoCentavos,
    exposicaoCentavos,
    natureza,
    consomeLimite: exposicaoCentavos > 0,
    explicacao: EXPLICACAO[natureza](pedido),
  };
};
