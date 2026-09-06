import { Injectable } from '@nestjs/common';
import type { PriceTableEntry, PromotionEntry } from '@synapse/types';

@Injectable()
export class PricingRepository {
  private readonly branchPrices = new Map<string, number>();
  private readonly customerPrices = new Map<string, number>();
  private readonly priceTables = new Map<string, PriceTableEntry[]>();
  private readonly promotions = new Map<string, PromotionEntry[]>();
  private readonly sellerDiscountLimits = new Map<string, number>();

  setBranchPrice(tenantId: string, productId: string, branchId: string, price: number): void {
    this.branchPrices.set(`${tenantId}:${productId}:${branchId}`, price);
  }

  getBranchPrice(tenantId: string, productId: string, branchId: string): number | undefined {
    return this.branchPrices.get(`${tenantId}:${productId}:${branchId}`);
  }

  setCustomerPrice(tenantId: string, productId: string, customerId: string, price: number): void {
    this.customerPrices.set(`${tenantId}:${productId}:${customerId}`, price);
  }

  getCustomerPrice(tenantId: string, productId: string, customerId: string): number | undefined {
    return this.customerPrices.get(`${tenantId}:${productId}:${customerId}`);
  }

  addPriceTableEntry(entry: PriceTableEntry): PriceTableEntry {
    const key = `${entry.tenantId}:${entry.productId}`;
    const entries = this.priceTables.get(key) ?? [];
    entries.push(entry);
    this.priceTables.set(key, entries);
    return entry;
  }

  listPriceTableEntries(tenantId: string, productId: string): PriceTableEntry[] {
    return this.priceTables.get(`${tenantId}:${productId}`) ?? [];
  }

  addPromotion(entry: PromotionEntry): PromotionEntry {
    const key = `${entry.tenantId}:${entry.productId}`;
    const entries = this.promotions.get(key) ?? [];
    entries.push(entry);
    this.promotions.set(key, entries);
    return entry;
  }

  listPromotions(tenantId: string, productId: string): PromotionEntry[] {
    return this.promotions.get(`${tenantId}:${productId}`) ?? [];
  }

  setSellerDiscountLimit(tenantId: string, sellerId: string, limitPercent: number): void {
    this.sellerDiscountLimits.set(`${tenantId}:${sellerId}`, limitPercent);
  }

  /** Sem limite configurado, o vendedor nao tem autonomia nenhuma — todo
   *  desconto negociado exige aprovacao (§6: "limite por vendedor"). */
  getSellerDiscountLimit(tenantId: string, sellerId: string): number {
    return this.sellerDiscountLimits.get(`${tenantId}:${sellerId}`) ?? 0;
  }
}
