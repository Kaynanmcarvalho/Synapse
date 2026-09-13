import type {
  CadastroDoCliente,
  PainelDeAnaliseDeCredito,
  PedidoDeVenda,
  PedidoNaFila,
  ResultadoDaLiberacao,
} from '@synapse/types';
import { apiRequest } from '../../lib/dev-auth';

/** Quantos registros cada lista da tela carrega — o combinado com a operacao e
 *  ver sempre os ultimos 150 de cada parte. */
export const LIMITE_DE_REGISTROS = 150;

export const listarFilaDeAnalise = (limite = 200): Promise<PedidoNaFila[]> =>
  apiRequest(`/credit-analysis/queue?limit=${limite}`);

/** Marca de impressao: e do usuario que esta pedindo, e nao do pedido. */
export const marcarImpressao = (pedidoId: string, impresso: boolean): Promise<unknown> =>
  apiRequest(`/credit-analysis/orders/${encodeURIComponent(pedidoId)}/impressao`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ impresso }),
  });

export const carregarPainelDoCliente = (
  customerId: string,
  limite = LIMITE_DE_REGISTROS,
): Promise<PainelDeAnaliseDeCredito> =>
  apiRequest(`/credit-analysis/customers/${encodeURIComponent(customerId)}?limit=${limite}`);

const JSON_HEADERS = { 'Content-Type': 'application/json' };

/** O pedido inteiro — para quando ele e aberto pela lupa de um titulo ou nota. */
export const buscarPedido = (id: string): Promise<PedidoDeVenda> =>
  apiRequest(`/credit-analysis/orders/${encodeURIComponent(id)}`);

/** Liberacao unica dos pedidos marcados; volta o que passou e o que ficou. */
export const liberarPedidos = (ids: readonly string[]): Promise<ResultadoDaLiberacao> =>
  apiRequest('/credit-analysis/orders/liberar', {
    method: 'POST',
    headers: JSON_HEADERS,
    body: JSON.stringify({ ids }),
  });

export const observarPedido = (id: string, texto: string): Promise<PedidoDeVenda> =>
  apiRequest(`/credit-analysis/orders/${encodeURIComponent(id)}/observacoes`, {
    method: 'POST',
    headers: JSON_HEADERS,
    body: JSON.stringify({ texto }),
  });

export type CamposDoCadastro = Omit<CadastroDoCliente, 'id' | 'updatedAt' | 'updatedByName'>;

export const buscarCadastro = (customerId: string): Promise<CadastroDoCliente> =>
  apiRequest(`/credit-analysis/customers/${encodeURIComponent(customerId)}/cadastro`);

export const salvarCadastro = (
  customerId: string,
  campos: CamposDoCadastro,
): Promise<CadastroDoCliente> =>
  apiRequest(`/credit-analysis/customers/${encodeURIComponent(customerId)}/cadastro`, {
    method: 'PUT',
    headers: JSON_HEADERS,
    body: JSON.stringify(campos),
  });
