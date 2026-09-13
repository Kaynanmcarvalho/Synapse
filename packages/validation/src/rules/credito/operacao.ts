import type { TipoDePedido } from '@synapse/types';

/** Classificacao do tipo de pedido, num lugar so.
 *
 *  Toda regra que precise saber "isto e venda?" ou "isto gera cobranca?" le
 *  daqui — exposicao, metricas de compra, comparacao com o ticket e os atalhos
 *  da fila. Um array de tipos copiado em cada tela divergiria na primeira
 *  mudanca.
 *
 *  Nada aqui apaga a operacao do historico: bonificacao e troca continuam na
 *  lista de pedidos do cliente. So nao entram em metrica de venda efetiva. */

export type ClasseDaOperacao = 'VENDA' | 'SEM_COBRANCA' | 'CONSIGNACAO';

/** Tipos que nao geram titulo a receber. */
export const TIPOS_SEM_COBRANCA: ReadonlySet<TipoDePedido> = new Set<TipoDePedido>([
  'BONIFICACAO',
  'TROCA',
  'AMOSTRA',
  'DEVOLUCAO',
]);

export const classeDaOperacao = (tipo: TipoDePedido): ClasseDaOperacao => {
  if (TIPOS_SEM_COBRANCA.has(tipo)) return 'SEM_COBRANCA';
  if (tipo === 'CONSIGNACAO') return 'CONSIGNACAO';
  return 'VENDA';
};

/** Venda efetiva: a unica operacao que entra em ticket medio, volume de
 *  compras, prazo medio de venda e na comparacao "pedido atual x habitual".
 *  Consignacao fica fora: a mercadoria ainda nao foi vendida. */
export const ehVendaEfetiva = (tipo: TipoDePedido): boolean => classeDaOperacao(tipo) === 'VENDA';
