/** As 5 situações reais de uma parcela (apps/api/.../finance/entities/boleto.ts).
 *  O front nunca tipou isso — `status: string` — mas a UI precisa de rótulo e
 *  tom, não só do valor cru em inglês. */
export type ChargeStatus = 'PENDING' | 'REGISTERED' | 'PAID' | 'OVERDUE' | 'CANCELLED';

/** A matriz de ações por status — regra do domínio financeiro, não do
 *  DataGrid. Preservada exatamente do código legado: o SDL não sabe (e não
 *  deve saber) o que "boleto vencido pode fazer". */
export const podeBaixarManualmente = (status: ChargeStatus): boolean =>
  !['PAID', 'CANCELLED', 'PENDING'].includes(status);

export const podeCancelar = (status: ChargeStatus): boolean =>
  !['PAID', 'CANCELLED'].includes(status);
