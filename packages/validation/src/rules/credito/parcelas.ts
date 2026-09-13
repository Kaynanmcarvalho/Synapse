import type { PedidoDeVenda, Titulo } from '@synapse/types';
import { exposicaoDoPedido, vencimentosDoPedido, type PedidoParaExposicao } from './exposicao';
import { diasEntre, somarDias } from './texto';

/** Calendario das parcelas de um pedido.
 *
 *  Antes do faturamento, o vencimento e uma simulacao: conta os dias da
 *  condicao a partir da data-base (o dia em que o analista esta olhando), e por
 *  isso muda de um dia para o outro. Depois do faturamento, o vencimento e o que
 *  foi gravado no titulo e nunca mais muda — recalcular a partir de hoje faria o
 *  boleto emitido "vencer" em outra data na tela. */

export interface ParcelaDaCondicao {
  readonly numero: number;
  readonly total: number;
  /** Dias da condicao (simulacao) ou da emissao da nota ate o vencimento. */
  readonly dias: number | null;
  /** AAAA-MM-DD. */
  readonly vencimento: string;
  readonly valorCentavos: number;
  /** Titulo gravado, quando o pedido ja foi faturado. */
  readonly tituloId: string | null;
}

export interface CalendarioDasParcelas {
  readonly origem: 'SIMULACAO' | 'TITULOS';
  /** Data-base da simulacao (AAAA-MM-DD); nula quando as datas sao as gravadas. */
  readonly dataBase: string | null;
  readonly entradaCentavos: number;
  readonly financiadoCentavos: number;
  readonly parcelas: readonly ParcelaDaCondicao[];
}

/** Divide o valor como o financeiro divide ao gerar os titulos: o centavo que
 *  sobra vai um para cada parcela, da primeira em diante, e a soma sempre fecha. */
export const dividirEmParcelas = (totalCentavos: number, quantidade: number): readonly number[] => {
  if (quantidade <= 0) return [];
  const base = Math.floor(totalCentavos / quantidade);
  const sobra = totalCentavos - base * quantidade;
  return Array.from({ length: quantidade }, (_, indice) => base + (indice < sobra ? 1 : 0));
};

export const simularParcelas = (
  pedido: PedidoParaExposicao,
  dataBase: string,
): CalendarioDasParcelas => {
  const exposicao = exposicaoDoPedido(pedido);
  if (exposicao.natureza === 'SEM_COBRANCA') {
    return {
      origem: 'SIMULACAO',
      dataBase,
      entradaCentavos: 0,
      financiadoCentavos: 0,
      parcelas: [],
    };
  }
  const dias = vencimentosDoPedido(pedido);
  const valores = dividirEmParcelas(exposicao.financiadoCentavos, dias.length);
  return {
    origem: 'SIMULACAO',
    dataBase,
    entradaCentavos: exposicao.entradaCentavos,
    financiadoCentavos: exposicao.financiadoCentavos,
    parcelas: dias.map((prazo, indice) => ({
      numero: indice + 1,
      total: dias.length,
      dias: prazo,
      vencimento: somarDias(dataBase, prazo),
      valorCentavos: valores[indice] ?? 0,
      tituloId: null,
    })),
  };
};

export type TituloGravado = Pick<
  Titulo,
  'id' | 'numeroParcela' | 'totalDeParcelas' | 'vencimento' | 'valorOriginalCentavos' | 'status'
>;

export type PedidoDoCalendario = PedidoParaExposicao & Pick<PedidoDeVenda, 'situacao' | 'nota'>;

/** Faturado e o pedido que ja virou nota: dali em diante valem os titulos. */
export const pedidoFaturado = (pedido: Pick<PedidoDeVenda, 'situacao' | 'nota'>): boolean =>
  pedido.situacao === 'FATURADO' || pedido.nota !== null;

/** As parcelas que a tela mostra: simulacao para o pedido em aberto, datas
 *  gravadas para o faturado. `hoje` so e usado na simulacao. */
export const calendarioDoPedido = (
  pedido: PedidoDoCalendario,
  titulos: readonly TituloGravado[],
  hoje: string,
): CalendarioDasParcelas => {
  if (!pedidoFaturado(pedido)) return simularParcelas(pedido, hoje);

  const validos = titulos
    .filter((titulo) => titulo.status !== 'CANCELADO' && titulo.status !== 'RENEGOCIADO')
    .sort((a, b) => a.numeroParcela - b.numeroParcela || a.vencimento.localeCompare(b.vencimento));
  const emissao = pedido.nota?.emitidaEm ?? null;
  return {
    origem: 'TITULOS',
    dataBase: null,
    entradaCentavos: Math.max(0, pedido.entradaCentavos ?? 0),
    financiadoCentavos: validos.reduce((soma, titulo) => soma + titulo.valorOriginalCentavos, 0),
    parcelas: validos.map((titulo) => ({
      numero: titulo.numeroParcela,
      total: titulo.totalDeParcelas,
      dias: emissao ? diasEntre(emissao, titulo.vencimento) : null,
      vencimento: titulo.vencimento.slice(0, 10),
      valorCentavos: titulo.valorOriginalCentavos,
      tituloId: titulo.id,
    })),
  };
};

/** "14/21/28/35" para mostrar o parcelamento como o balcao fala. */
export const descricaoDoParcelamento = (dias: readonly number[]): string =>
  dias.length === 1 && dias[0] === 0 ? 'À vista' : dias.join(' / ');

/** Prazo medio da condicao: "28/35/42" da 35. */
export const prazoMedioDaCondicao = (dias: readonly number[]): number =>
  dias.length === 0 ? 0 : Math.round(dias.reduce((soma, valor) => soma + valor, 0) / dias.length);
