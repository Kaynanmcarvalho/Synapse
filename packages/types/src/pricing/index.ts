import type { BranchId, CustomerId, PriceTableId, ProductId, TenantId, UserId } from '../common';

/** Os seis niveis de precedencia (§6), da base para o topo. O nivel mais alto
 *  presente vence — e o vencedor e devolvido em `PriceResolutionResult.source`
 *  para a UI explicar de onde o preco veio. */
export const PRICE_LEVELS = [
  'GLOBAL',
  'FILIAL',
  'TABELA_PRECO',
  'CLIENTE_ESPECIFICO',
  'PROMOCAO',
  'NEGOCIACAO_AUTORIZADA',
] as const;

export type PriceLevel = (typeof PRICE_LEVELS)[number];

export type SalesChannel = 'atacado' | 'varejo';

export interface PriceTableEntry {
  readonly id: PriceTableId;
  readonly tenantId: TenantId;
  readonly productId: ProductId;
  readonly name: string;
  readonly price: number;
  readonly branchId: BranchId | null;
  readonly customerGroupId: string | null;
  readonly sellerId: UserId | null;
  readonly channel: SalesChannel | null;
  readonly minQuantity: number | null;
  readonly startsAt: string | null;
  readonly endsAt: string | null;
}

export interface PromotionEntry {
  readonly id: string;
  readonly tenantId: TenantId;
  readonly productId: ProductId;
  readonly price: number;
  readonly startsAt: string;
  readonly endsAt: string;
  readonly branchId: BranchId | null;
}

export interface CustomerSpecificPrice {
  readonly tenantId: TenantId;
  readonly productId: ProductId;
  readonly customerId: CustomerId;
  readonly price: number;
}

/** O que o vendedor pede. `requiresApproval` nao entra aqui: quem decide isso
 *  e o resolver, comparando `discountPercent` com o limite do vendedor —
 *  nunca o cliente que fez a chamada. */
export interface NegotiatedPriceRequest {
  readonly price: number;
  readonly requestedBy: UserId;
  readonly discountPercent: number;
}

export interface PriceResolutionResult {
  readonly price: number;
  readonly source: PriceLevel;
  readonly requiresApproval: boolean;
  readonly appliedRuleId: string | null;
}
