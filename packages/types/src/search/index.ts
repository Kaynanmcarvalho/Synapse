import type { TenantId, UserId } from '../common';

/** Um filtro salvo por um usuário numa tela — §60 "filtros salvos por
 *  usuário". `filterState` é opaco pro backend de propósito: cada tela tem
 *  o próprio formato de filtro, então validar a forma aqui só criaria
 *  acoplamento sem benefício real. */
export interface SavedFilter {
  readonly id: string;
  readonly tenantId: TenantId;
  readonly userId: UserId;
  readonly screen: string;
  readonly name: string;
  readonly filterState: Readonly<Record<string, unknown>>;
  readonly createdAt: string;
}
