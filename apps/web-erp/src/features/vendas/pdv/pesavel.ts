import { PRODUCT_STATUS_ALLOWS_SALE } from '@synapse/types';
import { conteudoDaEtiqueta, lerEtiquetaDeBalanca, quantidadeDaEtiqueta } from '../comum/balanca';
import { linhaDoProduto, type LinhaDaVenda } from '../comum/itens';
import { produtoPorCodigo, resolverPreco } from '../comum/vendas.api';

/** F7 Produto Pesável e etiqueta de balança lida no campo do produto: acha o
 *  produto, pega o preço do quilo e monta a linha com o peso. */
export const linhaPesada = async (dados: {
  readonly codigo: string;
  /** Peso digitado, em gramas (milésimos do quilo). Nulo: vem da etiqueta. */
  readonly pesoMilesimos: number | null;
  readonly filialId: string;
  readonly customerId: string | null;
}): Promise<LinhaDaVenda> => {
  const etiqueta = dados.pesoMilesimos === null ? lerEtiquetaDeBalanca(dados.codigo) : null;
  if (dados.pesoMilesimos === null && !etiqueta)
    throw new Error('Etiqueta de balança inválida: confira o código lido');
  const codigo = etiqueta ? etiqueta.codigoDoProduto : dados.codigo.trim();
  const produto = await produtoPorCodigo(codigo);
  if (!produto) throw new Error(`Produto ${codigo} não encontrado`);
  if (!PRODUCT_STATUS_ALLOWS_SALE[produto.status])
    throw new Error(`${produto.sku} - ${produto.name} não pode ser vendido`);
  const preco = await resolverPreco({
    productId: produto.id,
    branchId: dados.filialId,
    quantidadeMilesimos: 1000,
    customerId: dados.customerId,
  });
  const quantidade = etiqueta
    ? quantidadeDaEtiqueta(etiqueta, conteudoDaEtiqueta(), preco)
    : dados.pesoMilesimos;
  if (!quantidade) throw new Error('Peso zerado: pese de novo');
  return linhaDoProduto(produto, { quantidade, precoCentavos: preco });
};
