import { Injectable, NotFoundException } from '@nestjs/common';
import { asPriceTableId, type PriceResolutionResult, type PriceTableEntry } from '@synapse/types';
import type { CreatePriceTableEntryInput, ResolvePriceInput } from '@synapse/validation';
import { randomUUID } from 'node:crypto';
import type { TenantContext } from '../../iam/iam.types';
import { PricingRepository } from '../repositories/pricing.repository';
import { ProductRepository } from '../repositories/product.repository';

const today = (): string => new Date().toISOString().slice(0, 10);

const isWithinVigencia = (at: string, startsAt: string | null, endsAt: string | null): boolean => {
  if (startsAt && at < startsAt) return false;
  if (endsAt && at > endsAt) return false;
  return true;
};

/** Quantos criterios do input a entrada bate — usada pra escolher a mais
 *  especifica entre varias tabelas de preco que se aplicam ao mesmo pedido. */
const specificity = (entry: PriceTableEntry, input: ResolvePriceInput): number => {
  let score = 0;
  if (entry.branchId) score += entry.branchId === input.branchId ? 1 : -100;
  if (entry.customerGroupId) score += entry.customerGroupId === input.customerGroupId ? 1 : -100;
  if (entry.sellerId) score += entry.sellerId === input.sellerId ? 1 : -100;
  if (entry.channel) score += entry.channel === input.channel ? 1 : -100;
  if (entry.minQuantity != null) score += 1;
  return score;
};

@Injectable()
export class PricingService {
  constructor(
    private readonly repository: PricingRepository,
    private readonly products: ProductRepository,
  ) {}

  createPriceTableEntry(tenant: TenantContext, input: CreatePriceTableEntryInput): PriceTableEntry {
    const entry: PriceTableEntry = {
      id: asPriceTableId(randomUUID()),
      tenantId: tenant.tenantId as PriceTableEntry['tenantId'],
      productId: input.productId as PriceTableEntry['productId'],
      name: input.name,
      price: input.price,
      branchId: input.branchId as PriceTableEntry['branchId'],
      customerGroupId: input.customerGroupId,
      sellerId: input.sellerId as PriceTableEntry['sellerId'],
      channel: input.channel,
      minQuantity: input.minQuantity,
      startsAt: input.startsAt,
      endsAt: input.endsAt,
    };
    return this.repository.addPriceTableEntry(entry);
  }

  setBranchPrice(tenant: TenantContext, productId: string, branchId: string, price: number): void {
    this.repository.setBranchPrice(tenant.tenantId, productId, branchId, price);
  }

  setCustomerPrice(
    tenant: TenantContext,
    productId: string,
    customerId: string,
    price: number,
  ): void {
    this.repository.setCustomerPrice(tenant.tenantId, productId, customerId, price);
  }

  setSellerDiscountLimit(tenant: TenantContext, sellerId: string, limitPercent: number): void {
    this.repository.setSellerDiscountLimit(tenant.tenantId, sellerId, limitPercent);
  }

  /** §27/§1 "o desconto máximo é validado no backend": quem decide o limite
   *  de um vendedor é este método, nunca um valor que chegou no corpo da
   *  requisição — usado por `OrderService.quote` pra não confiar no cliente. */
  getSellerDiscountLimit(tenant: TenantContext, sellerId: string): number {
    return this.repository.getSellerDiscountLimit(tenant.tenantId, sellerId);
  }

  /** Percorre os seis niveis do §6, da base para o topo. Cada nivel presente
   *  sobrescreve o anterior; o resultado guarda de qual nivel o preco final
   *  veio, para a UI explicar ("este preco vem da tabela Atacado GO"). */
  resolvePrice(tenant: TenantContext, input: ResolvePriceInput): PriceResolutionResult {
    const product = this.products.findById(tenant.tenantId, input.productId);
    if (!product) throw new NotFoundException('Produto nao encontrado');

    const at = input.at ?? today();
    let price = product.pricing.salePrice;
    let source: PriceResolutionResult['source'] = 'GLOBAL';
    let appliedRuleId: string | null = null;

    if (input.branchId) {
      const branchPrice = this.repository.getBranchPrice(
        tenant.tenantId,
        input.productId,
        input.branchId,
      );
      if (branchPrice != null) {
        price = branchPrice;
        source = 'FILIAL';
      }
    }

    const tableEntry = this.bestPriceTableEntry(tenant.tenantId, input, at);
    if (tableEntry) {
      price = tableEntry.price;
      source = 'TABELA_PRECO';
      appliedRuleId = tableEntry.id;
    }

    if (input.customerId) {
      const customerPrice = this.repository.getCustomerPrice(
        tenant.tenantId,
        input.productId,
        input.customerId,
      );
      if (customerPrice != null) {
        price = customerPrice;
        source = 'CLIENTE_ESPECIFICO';
        appliedRuleId = null;
      }
    }

    const promotion = this.repository
      .listPromotions(tenant.tenantId, input.productId)
      .find(
        (promo) =>
          (!promo.branchId || promo.branchId === input.branchId) &&
          isWithinVigencia(at, promo.startsAt, promo.endsAt),
      );
    if (promotion) {
      price = promotion.price;
      source = 'PROMOCAO';
      appliedRuleId = promotion.id;
    }

    let requiresApproval = false;
    if (input.negotiatedPrice != null) {
      const sellerId = input.sellerId ?? tenant.userId;
      const discountPercent = price === 0 ? 0 : ((price - input.negotiatedPrice) / price) * 100;
      const limit = this.repository.getSellerDiscountLimit(tenant.tenantId, sellerId);
      if (discountPercent <= limit) {
        price = input.negotiatedPrice;
        source = 'NEGOCIACAO_AUTORIZADA';
        appliedRuleId = null;
      } else {
        requiresApproval = true;
      }
    }

    return { price, source, requiresApproval, appliedRuleId };
  }

  private bestPriceTableEntry(
    tenantId: string,
    input: ResolvePriceInput,
    at: string,
  ): PriceTableEntry | null {
    const candidates = this.repository
      .listPriceTableEntries(tenantId, input.productId)
      .filter((entry) => isWithinVigencia(at, entry.startsAt, entry.endsAt))
      .filter((entry) => entry.minQuantity == null || input.quantity >= entry.minQuantity)
      .map((entry) => ({ entry, score: specificity(entry, input) }))
      .filter(({ score }) => score > -100);

    if (candidates.length === 0) return null;
    candidates.sort(
      (a, b) => b.score - a.score || (b.entry.minQuantity ?? 0) - (a.entry.minQuantity ?? 0),
    );
    return candidates[0]?.entry ?? null;
  }
}
