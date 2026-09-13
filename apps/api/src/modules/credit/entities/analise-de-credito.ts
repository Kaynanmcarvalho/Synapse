import type {
  CarteiraDoCliente,
  NotaDoCliente,
  PagamentoDoCliente,
  PedidoDeVenda,
  Titulo,
  TituloEmAberto,
} from '@synapse/types';
import { contaNoSaldo, diasEntre, saldoCentavos } from '../../finance/entities/titulo';

/** Regras da analise de credito, puras e sem I/O: quem busca os dados e o
 *  servico; aqui so se decide o que o financeiro ve. */

/** Numero, serie e parcela do titulo. Quando o pedido ja virou nota, o titulo
 *  carrega o numero e a serie da nota — e assim que cliente e cobranca se
 *  entendem no telefone. Sem nota, sobra a identificacao do proprio titulo. */
export const identificacaoDoTitulo = (
  titulo: Titulo,
  pedidosPorId: ReadonlyMap<string, PedidoDeVenda>,
): { readonly numero: string; readonly serie: string; readonly parcela: string } => {
  const nota = titulo.orderId ? pedidosPorId.get(titulo.orderId)?.nota : null;
  return {
    numero: nota ? String(nota.numero) : titulo.id.slice(0, 8).toUpperCase(),
    serie: nota ? String(nota.serie) : '—',
    parcela: `${titulo.numeroParcela}/${titulo.totalDeParcelas}`,
  };
};

const doCliente = (titulos: readonly Titulo[], customerId: string): Titulo[] =>
  titulos.filter((titulo) => titulo.tipo === 'RECEBER' && titulo.customerId === customerId);

/** Dias de atraso de um titulo ainda aberto. Zero quando o vencimento nao chegou. */
export const diasVencidos = (titulo: Titulo, hoje: string): number =>
  Math.max(0, diasEntre(titulo.vencimento, hoje));

export const titulosEmAbertoDoCliente = (
  titulos: readonly Titulo[],
  customerId: string,
  pedidosPorId: ReadonlyMap<string, PedidoDeVenda>,
  hoje: string,
): readonly TituloEmAberto[] =>
  doCliente(titulos, customerId)
    .filter(contaNoSaldo)
    .map((titulo) => ({
      id: titulo.id,
      ...identificacaoDoTitulo(titulo, pedidosPorId),
      vencimento: titulo.vencimento,
      valorCentavos: titulo.valorOriginalCentavos,
      saldoCentavos: saldoCentavos(titulo),
      diasDeAtraso: diasVencidos(titulo, hoje),
    }))
    // O que esta vencido ha mais tempo primeiro: e o que decide a liberacao.
    .sort((a, b) => b.diasDeAtraso - a.diasDeAtraso || a.vencimento.localeCompare(b.vencimento));

/** Um pagamento por liquidacao, e nao por titulo: titulo pago em duas vezes
 *  aparece duas vezes, que e como o extrato do cliente realmente aconteceu. */
export const pagamentosDoCliente = (
  titulos: readonly Titulo[],
  customerId: string,
  pedidosPorId: ReadonlyMap<string, PedidoDeVenda>,
  limite: number,
): readonly PagamentoDoCliente[] =>
  doCliente(titulos, customerId)
    .flatMap((titulo) => {
      const identificacao = identificacaoDoTitulo(titulo, pedidosPorId);
      return titulo.liquidacoes.map((liquidacao) => ({
        tituloId: titulo.id,
        ...identificacao,
        vencimento: titulo.vencimento,
        pagoEm: liquidacao.data,
        valorCentavos: liquidacao.valorCentavos,
        // Negativo e pagamento adiantado; positivo, atraso; zero, em dia.
        diasDoPagamento: diasEntre(titulo.vencimento, liquidacao.data),
      }));
    })
    .sort((a, b) => b.pagoEm.localeCompare(a.pagoEm))
    .slice(0, limite);

export const carteiraDoCliente = (
  titulos: readonly Titulo[],
  customerId: string,
  pedidosPorId: ReadonlyMap<string, PedidoDeVenda>,
  hoje: string,
  limite: number,
): CarteiraDoCliente => {
  const emAberto = titulosEmAbertoDoCliente(titulos, customerId, pedidosPorId, hoje);
  const pagamentos = pagamentosDoCliente(titulos, customerId, pedidosPorId, limite);
  const somar = (valores: readonly number[]) => valores.reduce((soma, valor) => soma + valor, 0);

  return {
    titulosEmAberto: emAberto.slice(0, limite),
    totalVencidoCentavos: somar(
      emAberto.filter((t) => t.diasDeAtraso > 0).map((t) => t.saldoCentavos),
    ),
    totalAVencerCentavos: somar(
      emAberto.filter((t) => t.diasDeAtraso === 0).map((t) => t.saldoCentavos),
    ),
    pagamentos,
    // Total do que esta na tela: os mesmos pagamentos que o analista consegue ver.
    totalPagoCentavos: somar(pagamentos.map((p) => p.valorCentavos)),
  };
};

export const notasDosPedidos = (
  pedidos: readonly PedidoDeVenda[],
  limite: number,
): readonly NotaDoCliente[] =>
  pedidos
    .flatMap((pedido) =>
      pedido.nota
        ? [
            {
              pedidoId: pedido.id,
              numero: pedido.nota.numero,
              serie: pedido.nota.serie,
              chaveDeAcesso: pedido.nota.chaveDeAcesso,
              emitidaEm: pedido.nota.emitidaEm,
              totalCentavos: pedido.totalCentavos,
            },
          ]
        : [],
    )
    .sort((a, b) => b.emitidaEm.localeCompare(a.emitidaEm))
    .slice(0, limite);

export const emAnalise = (pedido: PedidoDeVenda): boolean =>
  pedido.situacao === 'AGUARDANDO_ANALISE';

export const totalCentavosDe = (pedidos: readonly PedidoDeVenda[]): number =>
  pedidos.reduce((soma, pedido) => soma + pedido.totalCentavos, 0);

/** Prazo medio a partir dos vencimentos combinados: "28/35/42" vira 35. */
export const prazoMedio = (vencimentosEmDias: readonly number[]): number =>
  vencimentosEmDias.length === 0
    ? 0
    : Math.round(
        vencimentosEmDias.reduce((soma, dias) => soma + dias, 0) / vencimentosEmDias.length,
      );
