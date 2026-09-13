import type {
  CadastroDoCliente,
  CarteiraDoCliente,
  CustomerId,
  ResumoFinanceiroDoCliente,
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

const somar = (valores: readonly number[]): number =>
  valores.reduce((total, valor) => total + valor, 0);

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
      pedidoId: titulo.orderId,
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
        pedidoId: titulo.orderId,
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

export const SEM_TITULOS: ResumoFinanceiroDoCliente = {
  vencidoCentavos: 0,
  aVencerCentavos: 0,
  titulosVencidos: 0,
  diasDeAtrasoMaximo: 0,
};

/** A situacao do cliente em uma linha, para a fila mostrar quem esta devendo
 *  antes de o analista abrir a ficha. */
export const resumoFinanceiro = (
  titulos: readonly Titulo[],
  customerId: string,
  hoje: string,
): ResumoFinanceiroDoCliente => {
  const emAberto = titulosEmAbertoDoCliente(titulos, customerId, new Map(), hoje);
  const vencidos = emAberto.filter((titulo) => titulo.diasDeAtraso > 0);
  return {
    vencidoCentavos: somar(vencidos.map((titulo) => titulo.saldoCentavos)),
    aVencerCentavos: somar(
      emAberto.filter((titulo) => titulo.diasDeAtraso === 0).map((titulo) => titulo.saldoCentavos),
    ),
    titulosVencidos: vencidos.length,
    diasDeAtrasoMaximo: vencidos.reduce((maior, titulo) => Math.max(maior, titulo.diasDeAtraso), 0),
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

/** Cadastro que ainda nao existe: abre com o que o ultimo pedido trouxe, em vez
 *  de um formulario em branco que obriga o analista a redigitar tudo. */
export const rascunhoDoCadastro = (
  customerId: string,
  pedido: PedidoDeVenda | null,
): CadastroDoCliente => {
  const documento = (pedido?.clienteDocumento ?? '').replace(/\D/g, '');
  return {
    id: customerId as CustomerId,
    type: documento.length === 11 ? 'PF' : 'PJ',
    name: pedido?.clienteNome ?? '',
    legalName: null,
    taxId: documento,
    stateRegistration: null,
    phone: '',
    whatsapp: null,
    email: null,
    address: {
      street: '',
      number: '',
      complement: null,
      district: pedido?.clienteBairro ?? '',
      city: pedido?.clienteCidade ?? '',
      state: '',
      postalCode: '',
    },
    creditLimit: 0,
    updatedAt: null,
    updatedByName: null,
  };
};

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
