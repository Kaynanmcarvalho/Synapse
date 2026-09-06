import type { BranchId, TenantId, UserId } from '../common';

/** §27/§1: o perfil de um vendedor externo. O limite de desconto e a
 *  tabela de preço NÃO ficam aqui — já são resolvidos por
 *  `PricingService` (seller discount limit, tabela de preço por
 *  sellerId), e duplicar esses dois campos aqui criaria duas fontes de
 *  verdade pra mesma regra. */
export interface Seller {
  readonly id: string; // = userId
  readonly tenantId: TenantId;
  readonly userId: UserId;
  readonly name: string;
  readonly branchId: BranchId;
  readonly region: string;
  readonly route: string | null;
  readonly commissionPercent: number;
  readonly monthlyGoalCentavos: number;
  readonly active: boolean;
  readonly createdAt: string;
}

export interface SellerDashboard {
  readonly salesTodayCentavos: number;
  readonly salesThisMonthCentavos: number;
  readonly commissionThisMonthCentavos: number;
  readonly monthlyGoalCentavos: number;
  readonly goalProgressPercent: number;
  readonly customersServedThisMonth: number;
  readonly pendingOrders: number;
}
