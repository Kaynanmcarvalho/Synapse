import type {
  AcaoDeCredito,
  CadastroDoCliente,
  DetalheDaNota,
  DetalheDoPedido,
  DetalheDoTitulo,
  PainelDeAnaliseDeCredito,
  PedidoDeVenda,
  PedidoNaFila,
  ResultadoDaDecisao,
  ResultadoDaLiberacao,
} from '@synapse/types';
import { apiRequest } from '../../lib/dev-auth';

/** Quantos registros cada lista da tela carrega — o combinado com a operacao e
 *  ver sempre os ultimos 150 de cada parte. */
export const LIMITE_DE_REGISTROS = 150;

const JSON_HEADERS = { 'Content-Type': 'application/json' };
const caminho = (valor: string) => encodeURIComponent(valor);

export const listarFilaDeAnalise = (limite = 200): Promise<PedidoNaFila[]> =>
  apiRequest(`/credit-analysis/queue?limit=${limite}`);

/** Marca de impressao: e do usuario que esta pedindo, e nao do pedido. */
export const marcarImpressao = (pedidoId: string, impresso: boolean): Promise<unknown> =>
  apiRequest(`/credit-analysis/orders/${caminho(pedidoId)}/impressao`, {
    method: 'POST',
    headers: JSON_HEADERS,
    body: JSON.stringify({ impresso }),
  });

export const carregarPainelDoCliente = (
  customerId: string,
  limite = LIMITE_DE_REGISTROS,
): Promise<PainelDeAnaliseDeCredito> =>
  apiRequest(`/credit-analysis/customers/${caminho(customerId)}?limit=${limite}`);

/** O pedido inteiro — para quando ele e aberto fora da ficha. */
export const buscarPedido = (id: string): Promise<PedidoDeVenda> =>
  apiRequest(`/credit-analysis/orders/${caminho(id)}`);

/** Liberacao unica dos pedidos marcados; volta o que passou e o que ficou. A
 *  justificativa vale para os que estiverem fora da politica. */
export const liberarPedidos = (
  ids: readonly string[],
  justificativa: string | null = null,
): Promise<ResultadoDaLiberacao> =>
  apiRequest('/credit-analysis/orders/liberar', {
    method: 'POST',
    headers: JSON_HEADERS,
    body: JSON.stringify({ ids, justificativa }),
  });

/** Aprovar, aprovar excepcionalmente ou reprovar um pedido. */
export const decidirPedido = (
  id: string,
  acao: AcaoDeCredito,
  justificativa: string | null,
): Promise<ResultadoDaDecisao> =>
  apiRequest(`/credit-analysis/orders/${caminho(id)}/decisao`, {
    method: 'POST',
    headers: JSON_HEADERS,
    body: JSON.stringify({ acao, justificativa }),
  });

/** "Fulano abriu a analise" — a API grava no maximo um a cada meia hora. */
export const registrarVisualizacao = (id: string): Promise<{ registrado: boolean }> =>
  apiRequest(`/credit-analysis/orders/${caminho(id)}/visualizacao`, { method: 'POST' });

export const observarPedido = (id: string, texto: string): Promise<PedidoDeVenda> =>
  apiRequest(`/credit-analysis/orders/${caminho(id)}/observacoes`, {
    method: 'POST',
    headers: JSON_HEADERS,
    body: JSON.stringify({ texto }),
  });

export const buscarDetalheDoPedido = (id: string): Promise<DetalheDoPedido> =>
  apiRequest(`/credit-analysis/orders/${caminho(id)}/detalhe`);

export const buscarNota = (pedidoId: string): Promise<DetalheDaNota> =>
  apiRequest(`/credit-analysis/orders/${caminho(pedidoId)}/nota`);

export const buscarTitulo = (id: string): Promise<DetalheDoTitulo> =>
  apiRequest(`/credit-analysis/titulos/${caminho(id)}`);

export type CamposDoCadastro = Omit<
  CadastroDoCliente,
  'id' | 'updatedAt' | 'updatedByName' | 'financialStatus'
>;

export const buscarCadastro = (customerId: string): Promise<CadastroDoCliente> =>
  apiRequest(`/credit-analysis/customers/${caminho(customerId)}/cadastro`);

export const salvarCadastro = (
  customerId: string,
  campos: CamposDoCadastro,
): Promise<CadastroDoCliente> =>
  apiRequest(`/credit-analysis/customers/${caminho(customerId)}/cadastro`, {
    method: 'PUT',
    headers: JSON_HEADERS,
    body: JSON.stringify(campos),
  });
