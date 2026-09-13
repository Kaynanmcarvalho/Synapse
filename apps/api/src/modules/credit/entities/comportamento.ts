import type {
  AtrasoRegistrado,
  ComparacaoComHistorico,
  ComportamentoFinanceiro,
  ComprasNaJanela,
  JanelaDeTempo,
  ParametrosDaAnalise,
  PedidoDeVenda,
  PontualidadeNaJanela,
  Titulo,
} from '@synapse/types';
import { ehVendaEfetiva, exposicaoDoPedido } from '@synapse/validation';
import { diasEntre } from '../../finance/entities/titulo';
import { foiLiquidado, titulosAReceberDoCliente } from './situacao-de-credito';

/** Como o cliente paga e compra, em numeros que se explicam sozinhos.
 *
 *  Pontualidade e por titulo, e nao por liquidacao: um titulo pago metade
 *  antes e metade depois do vencimento foi pago com atraso. A data que conta e
 *  a da liquidacao que zerou o saldo. Nada aqui vira nota ou score — sao as
 *  evidencias que o analista pesa. */

export const DIAS_DA_JANELA: Record<JanelaDeTempo, number> = { '90D': 90, '6M': 182, '12M': 365 };

const JANELAS: readonly JanelaDeTempo[] = ['90D', '6M', '12M'];

const umaCasa = (valor: number): number => Math.round(valor * 10) / 10;

const somar = (valores: readonly number[]): number =>
  valores.reduce((total, valor) => total + valor, 0);

const media = (valores: readonly number[]): number | null =>
  valores.length === 0 ? null : somar(valores) / valores.length;

const inicioDaJanela = (hoje: string, janela: JanelaDeTempo): string =>
  new Date(Date.parse(`${hoje}T00:00:00.000Z`) - DIAS_DA_JANELA[janela] * 86_400_000)
    .toISOString()
    .slice(0, 10);

export interface TituloLiquidado {
  readonly titulo: Titulo;
  /** Dia em que o saldo zerou. */
  readonly quitadoEm: string;
  /** Negativo: antes do vencimento; zero: no dia; positivo: dias de atraso. */
  readonly dias: number;
}

export const titulosLiquidados = (
  titulos: readonly Titulo[],
  customerId: string,
): readonly TituloLiquidado[] =>
  titulosAReceberDoCliente(titulos, customerId)
    .filter(foiLiquidado)
    .map((titulo) => {
      const quitadoEm = titulo.liquidacoes
        .map((liquidacao) => liquidacao.data.slice(0, 10))
        .reduce((ultima, data) => (data > ultima ? data : ultima));
      return { titulo, quitadoEm, dias: diasEntre(titulo.vencimento, quitadoEm) };
    })
    .sort((a, b) => b.quitadoEm.localeCompare(a.quitadoEm));

export const pontualidade = (
  liquidados: readonly TituloLiquidado[],
  pagoCentavos: number,
): PontualidadeNaJanela => {
  const antecipados = liquidados.filter((item) => item.dias < 0).length;
  const noVencimento = liquidados.filter((item) => item.dias === 0).length;
  const atrasos = liquidados.map((item) => Math.max(0, item.dias));
  const atrasoMedio = media(atrasos);
  return {
    titulosLiquidados: liquidados.length,
    antecipados,
    noVencimento,
    emAtraso: liquidados.length - antecipados - noVencimento,
    percentualNoPrazo:
      liquidados.length === 0
        ? null
        : umaCasa(((antecipados + noVencimento) / liquidados.length) * 100),
    atrasoMedioDias: atrasoMedio === null ? null : umaCasa(atrasoMedio),
    maiorAtrasoDias: atrasos.length === 0 ? null : Math.max(...atrasos),
    pagoCentavos,
  };
};

/** Compra e venda efetiva aprovada ou faturada. Bonificacao, troca, amostra,
 *  devolucao e consignacao nao sao compra (a classificacao e a compartilhada,
 *  `ehVendaEfetiva`), e pedido reprovado ou cancelado nao aconteceu. E daqui
 *  que saem ticket medio, volume e prazo medio de venda. */
export const compraRealizada = (pedido: PedidoDeVenda): boolean =>
  ehVendaEfetiva(pedido.tipo) && (pedido.situacao === 'APROVADO' || pedido.situacao === 'FATURADO');

export const dataDaCompra = (pedido: PedidoDeVenda): string =>
  (pedido.nota?.emitidaEm ?? pedido.enviadoEm).slice(0, 10);

/** Venda a prazo: a unica que entra no prazo medio de venda. */
const aPrazo = (pedido: PedidoDeVenda): boolean => exposicaoDoPedido(pedido).natureza === 'A_PRAZO';

export const compras = (pedidos: readonly PedidoDeVenda[]): ComprasNaJanela => {
  const valorCentavos = somar(pedidos.map((pedido) => pedido.totalCentavos));
  const prazos = pedidos.filter(aPrazo).map((pedido) => pedido.prazoMedioEmDias);
  const prazoMedio = media(prazos);
  return {
    pedidos: pedidos.length,
    valorCentavos,
    ticketMedioCentavos: pedidos.length === 0 ? null : Math.round(valorCentavos / pedidos.length),
    prazoMedioDias: prazoMedio === null ? null : Math.round(prazoMedio),
    pedidosAPrazo: prazos.length,
  };
};

/** Maior saldo em aberto que o cliente ja teve, refeito dia a dia pelos
 *  titulos: cada titulo soma na emissao e cada liquidacao abate na data. O
 *  titulo renegociado sai no dia em que os substitutos foram criados. */
export const maiorExposicaoHistorica = (titulos: readonly Titulo[]): number | null => {
  const validos = titulos.filter((titulo) => titulo.status !== 'CANCELADO');
  if (validos.length === 0) return null;
  const porId = new Map(validos.map((titulo) => [titulo.id, titulo]));
  const movimentos = new Map<string, number>();
  const lancar = (data: string, valor: number) =>
    movimentos.set(data.slice(0, 10), (movimentos.get(data.slice(0, 10)) ?? 0) + valor);

  for (const titulo of validos) {
    lancar(titulo.criadoEm, titulo.valorOriginalCentavos);
    for (const liquidacao of titulo.liquidacoes) lancar(liquidacao.data, -liquidacao.valorCentavos);
    if (titulo.status === 'RENEGOCIADO') {
      const substituto = titulo.renegociadoPara.map((id) => porId.get(id)).find(Boolean);
      const pago = somar(titulo.liquidacoes.map((liquidacao) => liquidacao.valorCentavos));
      lancar(substituto?.criadoEm ?? titulo.criadoEm, -(titulo.valorOriginalCentavos - pago));
    }
  }

  let saldo = 0;
  let maior = 0;
  for (const data of [...movimentos.keys()].sort()) {
    saldo += movimentos.get(data) ?? 0;
    maior = Math.max(maior, saldo);
  }
  return maior;
};

export interface EntradaDoComportamento {
  readonly customerId: string;
  readonly titulos: readonly Titulo[];
  /** Pedidos do cliente dos ultimos 12 meses, de qualquer situacao. */
  readonly pedidos: readonly PedidoDeVenda[];
  readonly parametros: ParametrosDaAnalise;
  readonly hoje: string;
  /** "4388/1" para o ultimo atraso. */
  readonly identificar: (titulo: Titulo) => string;
}

export const comportamentoFinanceiro = (
  entrada: EntradaDoComportamento,
): ComportamentoFinanceiro => {
  const { customerId, hoje, parametros } = entrada;
  const liquidados = titulosLiquidados(entrada.titulos, customerId);
  const liquidacoes = titulosAReceberDoCliente(entrada.titulos, customerId).flatMap(
    (titulo) => titulo.liquidacoes,
  );
  const realizadas = entrada.pedidos.filter(compraRealizada);

  const janelas = Object.fromEntries(
    JANELAS.map((janela) => {
      const inicio = inicioDaJanela(hoje, janela);
      const pago = somar(
        liquidacoes
          .filter((liquidacao) => liquidacao.data.slice(0, 10) >= inicio)
          .map((liquidacao) => liquidacao.valorCentavos),
      );
      return [
        janela,
        {
          pontualidade: pontualidade(
            liquidados.filter((item) => item.quitadoEm >= inicio),
            pago,
          ),
          compras: compras(realizadas.filter((pedido) => dataDaCompra(pedido) >= inicio)),
        },
      ];
    }),
  ) as ComportamentoFinanceiro['janelas'];

  const atrasado = liquidados.find((item) => item.dias > 0);
  const ultimoAtraso: AtrasoRegistrado | null = atrasado
    ? {
        tituloId: atrasado.titulo.id,
        identificacao: entrada.identificar(atrasado.titulo),
        vencimento: atrasado.titulo.vencimento.slice(0, 10),
        pagoEm: atrasado.quitadoEm,
        dias: atrasado.dias,
      }
    : null;
  const datasDeCompra = realizadas.map(dataDaCompra).sort();

  return {
    janelas,
    titulosConsiderados: liquidados.length,
    historicoSuficiente: liquidados.length >= parametros.minimoDeTitulosLiquidados,
    ultimoAtraso,
    ultimaCompraEm: datasDeCompra.at(-1) ?? null,
    maiorExposicaoHistoricaCentavos: maiorExposicaoHistorica(
      titulosAReceberDoCliente(entrada.titulos, customerId),
    ),
  };
};

/** Os ultimos titulos liquidados, para o sinal "8 dos últimos 8 no prazo". */
export const pontualidadeRecente = (
  titulos: readonly Titulo[],
  customerId: string,
  quantos = 10,
): { readonly considerados: number; readonly noPrazo: number } => {
  const recentes = titulosLiquidados(titulos, customerId).slice(0, quantos);
  return {
    considerados: recentes.length,
    noPrazo: recentes.filter((item) => item.dias <= 0).length,
  };
};

/** O pedido de hoje contra o habitual. So compara com amostra minima: dois
 *  pedidos nao fazem "ticket medio".
 *
 *  E informativo. Nada daqui vira motivo, bloqueio ou exigencia de aprovacao
 *  excepcional: os motivos saem so da politica (motivosDaAnalise). */
export const comparacaoComHistorico = (
  pedido: PedidoDeVenda,
  comportamento: ComportamentoFinanceiro,
  parametros: ParametrosDaAnalise,
): ComparacaoComHistorico => {
  const ticket = comportamento.janelas['90D'].compras;
  const prazo = comportamento.janelas['12M'].compras;
  // Bonificacao de R$ 165 nao e "0,1x o ticket": nao e compra, nao se compara.
  const aplicavel = ehVendaEfetiva(pedido.tipo);
  const temTicket = aplicavel && ticket.pedidos >= parametros.minimoDePedidosParaComparar;
  const temPrazo = aplicavel && prazo.pedidosAPrazo >= parametros.minimoDePedidosParaComparar;
  const ticketMedio = temTicket ? ticket.ticketMedioCentavos : null;
  const prazoHabitual = temPrazo ? prazo.prazoMedioDias : null;
  const valor = exposicaoDoPedido(pedido).valorComercialCentavos;
  return {
    aplicavel,
    pedidosNoTicket: ticket.pedidos,
    pedidosNoPrazo: prazo.pedidosAPrazo,
    amostraSuficiente: temTicket || temPrazo,
    ticketMedioCentavos: ticketMedio,
    razaoSobreTicket: ticketMedio ? umaCasa(valor / ticketMedio) : null,
    prazoMedioHistoricoDias: prazoHabitual,
    diferencaDePrazoDias:
      prazoHabitual === null || !aPrazo(pedido) ? null : pedido.prazoMedioEmDias - prazoHabitual,
  };
};
