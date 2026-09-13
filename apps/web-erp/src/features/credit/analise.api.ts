import type { PainelDeAnaliseDeCredito, PedidoNaFila } from '@synapse/types';
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
