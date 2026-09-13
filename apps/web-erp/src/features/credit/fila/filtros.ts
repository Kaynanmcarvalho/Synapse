import type { PedidoNaFila } from '@synapse/types';
import { dataLocal } from './colunas';

/** Os filtros da barra: numero do pedido, cliente, vendedor e periodo. Sao os
 *  mesmos campos que a operacao ja usava no sistema antigo — quem migra nao
 *  precisa reaprender por onde procurar. */
export interface Filtros {
  readonly numero: string;
  readonly cliente: string;
  readonly vendedor: string;
  /** Datas em AAAA-MM-DD, como vem do input de data. Vazio nao limita. */
  readonly de: string;
  readonly ate: string;
}

export const FILTROS_VAZIOS: Filtros = { numero: '', cliente: '', vendedor: '', de: '', ate: '' };

export const temFiltro = (filtros: Filtros): boolean =>
  Object.values(filtros).some((valor) => valor.trim() !== '');

const semAcento = (valor: string): string =>
  valor.normalize('NFD').replace(/\p{M}/gu, '').toLowerCase().trim();

const combina = (valor: string, termo: string): boolean =>
  termo.trim() === '' || semAcento(valor).includes(semAcento(termo));

export const aplicarFiltros = (
  linhas: readonly PedidoNaFila[],
  filtros: Filtros,
): readonly PedidoNaFila[] =>
  linhas.filter(({ pedido }) => {
    const dia = dataLocal(pedido.enviadoEm);
    if (filtros.numero.trim() && !String(pedido.numero).includes(filtros.numero.trim()))
      return false;
    if (!combina(pedido.clienteNome, filtros.cliente)) return false;
    if (!combina(pedido.vendedorNome, filtros.vendedor)) return false;
    if (filtros.de && dia < filtros.de) return false;
    if (filtros.ate && dia > filtros.ate) return false;
    return true;
  });

/** Forma de pagamento com o prazo de verdade: "Boleto 14/21/28/35",
 *  "Cheque 14/21", "Cartão 3x", "PIX". Sem repetir a forma quando a condicao ja
 *  diz tudo. */
const A_VISTA = ['a vista', 'avista', 'sem cobranca', 'sem prazo'];
const INSTANTANEAS = ['pix', 'dinheiro', 'especie'];

export const pagamentoDoPedido = (pedido: PedidoNaFila['pedido']): string => {
  const forma = pedido.formaDePagamento.trim();
  const condicao = pedido.condicaoDePagamento.trim();
  if (!condicao) return forma;
  // "PIX À vista" e redundante: a forma ja diz que o dinheiro entra na hora.
  if (INSTANTANEAS.includes(semAcento(forma)) && A_VISTA.includes(semAcento(condicao)))
    return forma;
  if (semAcento(condicao) === semAcento(forma)) return forma;
  if (semAcento(condicao).startsWith(semAcento(forma))) return condicao;
  return `${forma} ${condicao}`;
};
