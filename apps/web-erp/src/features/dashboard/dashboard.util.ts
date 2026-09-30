import { formatarMoeda } from '../customers/formato';
import type { Totals } from './dashboard.types';

/** Cartões da faixa "Resultados do período" — mesmos campos que já vinham
 *  prontos de `totals`, só formatados; Comissão só existe para o perfil
 *  vendedor (é o único totalizador que a API calcula por vendedor). */
export function montarCards(
  totals: Totals | null | undefined,
  profile: string,
): ReadonlyArray<readonly [string, string]> {
  if (!totals) return [];
  return [
    ['Faturamento', formatarMoeda(totals.revenueCentavos)],
    ['Vendas', String(totals.sales)],
    ['Ticket médio', formatarMoeda(totals.averageTicketCentavos)],
    ['Clientes atendidos', String(totals.customers)],
    ...(profile === 'seller'
      ? ([['Comissão', formatarMoeda(totals.commissionCentavos)]] as const)
      : []),
  ];
}
