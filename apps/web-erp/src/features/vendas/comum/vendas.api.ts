import type {
  CashSession,
  ImpressaoDoPedido,
  ItemDeTabela,
  Page,
  PedidoDeVenda,
  PosSale,
  Product,
} from '@synapse/types';
import { API_URL, apiRequest, authHeaders } from '../../../lib/dev-auth';
import { corpoJson, listarTabela } from '../../cadastros/comum/cadastros.api';

/** Tudo o que o Ponto de Vendas e o PDV conversam com a API: catálogo, preço,
 *  caixa, venda, pedido do balcão e impressão. */

export interface Filial {
  readonly id: string;
  readonly name: string;
  readonly isHeadquarters: boolean;
}

export const listarFiliais = (): Promise<Filial[]> => apiRequest('/iam/branches');

export const buscarProdutos = (
  termo: string,
  filtros: { readonly categoryId?: string | null; readonly limite?: number } = {},
): Promise<Page<Product>> => {
  const parametros = new URLSearchParams({ limit: String(filtros.limite ?? 30) });
  if (termo.trim()) parametros.set('q', termo.trim());
  if (filtros.categoryId) parametros.set('categoryId', filtros.categoryId);
  return apiRequest(`/catalog/products?${parametros.toString()}`);
};

/** Código de barras, SKU ou código interno. Não achou: `null`. */
export const produtoPorCodigo = async (codigo: string): Promise<Product | null> => {
  try {
    return await apiRequest<Product>(`/catalog/products/by-code/${encodeURIComponent(codigo)}`);
  } catch (falha: unknown) {
    if (falha instanceof Error && /n[aã]o encontrado|404/i.test(falha.message)) return null;
    throw falha;
  }
};

export const produtoPorId = (id: string): Promise<Product> =>
  apiRequest(`/catalog/products/${encodeURIComponent(id)}`);

/** Preço de venda pela regra de preço (filial, cliente, quantidade), em centavos. */
export const resolverPreco = async (dados: {
  readonly productId: string;
  readonly branchId: string;
  readonly quantidadeMilesimos: number;
  readonly customerId?: string | null;
}): Promise<number> => {
  const resolvido = await apiRequest<{ readonly price: number }>(
    '/catalog/pricing/resolve',
    corpoJson('POST', {
      productId: dados.productId,
      branchId: dados.branchId,
      quantity: Math.max(dados.quantidadeMilesimos, 1) / 1000,
      ...(dados.customerId ? { customerId: dados.customerId } : {}),
    }),
  );
  return Math.round(resolvido.price * 100);
};

export const listarFormasDePagamento = (): Promise<ItemDeTabela[]> =>
  listarTabela('formas-de-pagamento', { somenteAtivos: true });

// ---------------------------------------------------------------- Balcão

export interface CorpoDoPedidoDeBalcao {
  readonly branchId: string;
  readonly customerId: string;
  readonly funcionarioId: string;
  readonly tipo: PedidoDeVenda['tipo'];
  readonly formaDePagamentoCodigo: number;
  readonly condicaoDePagamento: string;
  readonly freteCentavos: number;
  readonly acrescimoCentavos: number;
  readonly observacao: string | null;
  readonly itens: readonly {
    readonly productId: string;
    readonly quantidade: number;
    readonly precoNegociadoCentavos: number | null;
    readonly descontoCentavos: number;
    readonly lote: string | null;
  }[];
}

export interface SugestaoDoCliente {
  readonly produto: Product;
  readonly vezes: number;
  readonly ultimaCompraEm: string;
}

export const registrarPedidoDeBalcao = (corpo: CorpoDoPedidoDeBalcao): Promise<PedidoDeVenda> =>
  apiRequest('/vendas/balcao/pedidos', corpoJson('POST', corpo));

export const historicoDoBalcao = (
  filtros: { readonly desde?: string | null; readonly funcionarioId?: string | null } = {},
): Promise<PedidoDeVenda[]> => {
  const parametros = new URLSearchParams();
  if (filtros.desde) parametros.set('desde', filtros.desde);
  if (filtros.funcionarioId) parametros.set('funcionarioId', filtros.funcionarioId);
  const consulta = parametros.toString();
  return apiRequest(`/vendas/balcao/pedidos${consulta ? `?${consulta}` : ''}`);
};

export const impressaoDoPedidoDeBalcao = (id: string): Promise<ImpressaoDoPedido> =>
  apiRequest(`/vendas/balcao/pedidos/${id}/impressao`);

export const sugestoesDoCliente = (customerId: string): Promise<SugestaoDoCliente[]> =>
  apiRequest(`/vendas/balcao/sugestoes/${customerId}`);

// ---------------------------------------------------------------- PDV

export const caixaAtual = (branchId: string): Promise<CashSession | null> =>
  apiRequest(`/sales/pos/cash-sessions/current?branchId=${encodeURIComponent(branchId)}`);

export const abrirCaixa = (branchId: string, valorCentavos: number): Promise<CashSession> =>
  apiRequest(
    '/sales/pos/cash-sessions',
    corpoJson('POST', { branchId, openingAmount: valorCentavos }),
  );

export const movimentarCaixa = (
  caixaId: string,
  tipo: 'supply' | 'withdrawal',
  valorCentavos: number,
  motivo: string,
): Promise<CashSession> =>
  apiRequest(
    `/sales/pos/cash-sessions/${caixaId}/${tipo}`,
    corpoJson('POST', { amount: valorCentavos, reason: motivo }),
  );

export const fecharCaixa = (caixaId: string, contadoCentavos: number): Promise<CashSession> =>
  apiRequest(
    `/sales/pos/cash-sessions/${caixaId}/close`,
    corpoJson('POST', { countedCash: contadoCentavos }),
  );

export interface CorpoDaVendaDoPdv {
  readonly modo: 'NFCE' | 'BALCAO';
  readonly customerId: string | null;
  readonly customerTaxId: string | null;
  readonly clienteNome: string | null;
  readonly funcionarioId: string | null;
  readonly mesaOuCartao: string | null;
  readonly items: readonly {
    readonly productId: string;
    readonly quantity: number;
    readonly discount: number;
    readonly surcharge: number;
    readonly lote: string | null;
    readonly serie: string | null;
  }[];
  readonly payments: readonly { readonly formaCodigo: number; readonly amount: number }[];
}

export const concluirVenda = (caixaId: string, corpo: CorpoDaVendaDoPdv): Promise<PosSale> =>
  apiRequest(`/sales/pos/cash-sessions/${caixaId}/sales`, corpoJson('POST', corpo));

export const vendasDoCaixa = (caixaId: string): Promise<PosSale[]> =>
  apiRequest(`/sales/pos/cash-sessions/${caixaId}/sales`);

export const impressaoDaVenda = (id: string): Promise<ImpressaoDoPedido> =>
  apiRequest(`/sales/pos/sales/${id}/impressao`);

export const cancelarVenda = (id: string, motivo: string): Promise<PosSale> =>
  apiRequest(`/sales/pos/sales/${id}/cancel`, corpoJson('POST', { motivo }));

/** O DANFE da NFC-e em PDF, aberto numa aba nova. */
export const abrirDanfe = async (documentoId: string): Promise<void> => {
  const aba = window.open('', '_blank');
  const resposta = await fetch(`${API_URL}/fiscal/nfce/${documentoId}/danfe`, {
    headers: await authHeaders(),
  });
  if (!resposta.ok) {
    aba?.close();
    const corpo = (await resposta.json().catch(() => ({}))) as { message?: string };
    throw new Error(corpo.message ?? 'Não foi possível abrir a NFC-e');
  }
  const endereco = URL.createObjectURL(await resposta.blob());
  if (aba) aba.location.href = endereco;
  else window.open(endereco, '_blank');
  window.setTimeout(() => URL.revokeObjectURL(endereco), 60_000);
};
