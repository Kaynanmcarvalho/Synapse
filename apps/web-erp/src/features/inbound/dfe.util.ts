import { escreverMoeda } from '../customers/formato';
import { escreverQuantidade } from '../vendas/comum/itens';
import type { DfeItem } from './dfe.api';
import type { RascunhoDoItem } from './dfe.grammar';

export const rascunhoDoOriginal = (item: DfeItem): RascunhoDoItem => ({
  productId: item.productId ?? '',
  quantidadeTexto: escreverQuantidade(item.quantidadeMilesimos),
  custoTexto: escreverMoeda(item.custoUnitarioCentavos),
  lote: item.lote ?? '',
  validade: item.validade ?? '',
});
