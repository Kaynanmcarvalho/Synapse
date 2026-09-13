import type { AutorDoRegistro, PedidoDeVenda } from '@synapse/types';

/** Quem digitou o pedido — o usuario ou caixa, que nao e o representante. O
 *  pedido novo guarda o campo; o antigo guarda o mesmo dado no evento LANCADO. */
export const lancadoPor = (pedido: PedidoDeVenda): AutorDoRegistro | null => {
  if (pedido.lancadoPor) return pedido.lancadoPor;
  const lancado = (pedido.historico ?? []).find((evento) => evento.tipo === 'LANCADO');
  return lancado ? { uid: lancado.porUid, nome: lancado.porNome } : null;
};
