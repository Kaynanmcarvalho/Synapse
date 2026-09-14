import type { ItemDoPedido, PosItem } from '@synapse/types';
import type { LinhaDaVenda } from './itens';
import { brutoDaLinha } from './itens';
import { resolverPreco } from './vendas.api';

/** Copia os itens de um pedido ou de uma venda antiga para a venda nova, com o
 *  preço de hoje. O desconto proporcional da época continua valendo. */

interface ItemAntigo {
  readonly productId: string;
  readonly codigo: string;
  readonly descricao: string;
  readonly unidade: string;
  readonly pesoUnitarioKg: number | null;
  readonly quantidade: number;
  readonly precoCentavos: number;
  readonly descontoCentavos: number;
  readonly lote: string | null;
  readonly serie: string | null;
}

export const doPedido = (item: ItemDoPedido): ItemAntigo => ({
  productId: item.productId,
  codigo: item.codigo ?? item.productId.slice(0, 8),
  descricao: item.descricao,
  unidade: item.unidade ?? 'UN',
  pesoUnitarioKg: item.pesoUnitarioKg ?? null,
  quantidade: item.quantidade,
  precoCentavos: item.precoUnitarioCentavos,
  descontoCentavos: item.descontoCentavos,
  lote: item.lote ?? null,
  serie: null,
});

export const daVenda = (item: PosItem): ItemAntigo => ({
  productId: item.productId,
  codigo: item.codigo ?? item.productId.slice(0, 8),
  descricao: item.description,
  unidade: item.unidade ?? 'UN',
  pesoUnitarioKg: item.pesoUnitarioKg ?? null,
  quantidade: item.quantity,
  precoCentavos: item.unitPrice,
  descontoCentavos: item.discount,
  lote: item.lote ?? null,
  serie: item.serie ?? null,
});

export const repetirItens = async (
  itens: readonly ItemAntigo[],
  contexto: { readonly filialId: string; readonly customerId: string | null },
): Promise<LinhaDaVenda[]> =>
  Promise.all(
    itens.map(async (item, indice): Promise<LinhaDaVenda> => {
      const preco = await resolverPreco({
        productId: item.productId,
        branchId: contexto.filialId,
        quantidadeMilesimos: item.quantidade,
        customerId: contexto.customerId,
      });
      const brutoAntigo = brutoDaLinha(item);
      const bruto = brutoDaLinha({ quantidade: item.quantidade, precoCentavos: preco });
      const desconto =
        brutoAntigo > 0 ? Math.round((bruto * item.descontoCentavos) / brutoAntigo) : 0;
      return {
        chave: `copia-${Date.now()}-${indice}`,
        productId: item.productId,
        codigo: item.codigo,
        descricao: item.descricao,
        unidade: item.unidade,
        pesoUnitarioKg: item.pesoUnitarioKg,
        categoriaId: null,
        quantidade: item.quantidade,
        precoCentavos: preco,
        descontoCentavos: Math.min(bruto, desconto),
        lote: item.lote,
        serie: item.serie,
      };
    }),
  );
