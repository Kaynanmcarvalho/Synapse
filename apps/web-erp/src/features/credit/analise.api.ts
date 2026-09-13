import type { PainelDeAnaliseDeCredito, PedidoDeVenda } from '@synapse/types';
import { apiRequest } from '../../lib/dev-auth';

/** Quantos registros cada lista da tela carrega — o combinado com a operacao e
 *  ver sempre os ultimos 150 de cada parte. */
export const LIMITE_DE_REGISTROS = 150;

export const listarFilaDeAnalise = (limite = 200): Promise<PedidoDeVenda[]> =>
  apiRequest(`/credit-analysis/queue?limit=${limite}`);

export const carregarPainelDoCliente = (
  customerId: string,
  limite = LIMITE_DE_REGISTROS,
): Promise<PainelDeAnaliseDeCredito> =>
  apiRequest(`/credit-analysis/customers/${encodeURIComponent(customerId)}?limit=${limite}`);
