import { Inject, Injectable } from '@nestjs/common';
import type { Firestore, QueryDocumentSnapshot } from '@synapse/firebase/admin';
import type { PriceTableEntry, PromotionEntry } from '@synapse/types';
import { FIREBASE_FIRESTORE } from '../../iam/firebase.tokens';

/** As regras de preco do §6 no Firestore, sob o tenant:
 *
 *  - `precosPorFilial/{produto}_{filial}` e `precosPorCliente/{produto}_{cliente}`;
 *  - `tabelasDePreco/{id}` e `promocoes/{id}`, consultadas por produto;
 *  - `limitesDeDesconto/{vendedor}`.
 *
 *  Antes era memoria da API: reiniciar zerava o limite de desconto de todo
 *  vendedor e apagava as tabelas de preco. */
@Injectable()
export class PricingRepository {
  constructor(@Inject(FIREBASE_FIRESTORE) private readonly db: Firestore) {}

  private doc(tenantId: string, collection: string, id: string) {
    return this.db.doc(`tenants/${tenantId}/${collection}/${id}`);
  }

  private async readNumber(
    tenantId: string,
    collection: string,
    id: string,
    field: string,
  ): Promise<number | undefined> {
    const snapshot = await this.doc(tenantId, collection, id).get();
    const value = snapshot.exists ? snapshot.data()?.[field] : undefined;
    return typeof value === 'number' ? value : undefined;
  }

  async setBranchPrice(
    tenantId: string,
    productId: string,
    branchId: string,
    price: number,
  ): Promise<void> {
    await this.doc(tenantId, 'precosPorFilial', `${productId}_${branchId}`).set({
      productId,
      branchId,
      price,
      updatedAt: new Date().toISOString(),
    });
  }

  getBranchPrice(tenantId: string, productId: string, branchId: string) {
    return this.readNumber(tenantId, 'precosPorFilial', `${productId}_${branchId}`, 'price');
  }

  async setCustomerPrice(
    tenantId: string,
    productId: string,
    customerId: string,
    price: number,
  ): Promise<void> {
    await this.doc(tenantId, 'precosPorCliente', `${productId}_${customerId}`).set({
      productId,
      customerId,
      price,
      updatedAt: new Date().toISOString(),
    });
  }

  getCustomerPrice(tenantId: string, productId: string, customerId: string) {
    return this.readNumber(tenantId, 'precosPorCliente', `${productId}_${customerId}`, 'price');
  }

  async addPriceTableEntry(entry: PriceTableEntry): Promise<PriceTableEntry> {
    await this.doc(entry.tenantId, 'tabelasDePreco', entry.id).set(entry);
    return entry;
  }

  async listPriceTableEntries(tenantId: string, productId: string): Promise<PriceTableEntry[]> {
    const snapshot = await this.db
      .collection(`tenants/${tenantId}/tabelasDePreco`)
      .where('productId', '==', productId)
      .get();
    return snapshot.docs.map((doc: QueryDocumentSnapshot) => doc.data() as PriceTableEntry);
  }

  async addPromotion(entry: PromotionEntry): Promise<PromotionEntry> {
    await this.doc(entry.tenantId, 'promocoes', entry.id).set(entry);
    return entry;
  }

  async listPromotions(tenantId: string, productId: string): Promise<PromotionEntry[]> {
    const snapshot = await this.db
      .collection(`tenants/${tenantId}/promocoes`)
      .where('productId', '==', productId)
      .get();
    return snapshot.docs.map((doc: QueryDocumentSnapshot) => doc.data() as PromotionEntry);
  }

  async setSellerDiscountLimit(
    tenantId: string,
    sellerId: string,
    limitPercent: number,
  ): Promise<void> {
    await this.doc(tenantId, 'limitesDeDesconto', sellerId).set({
      sellerId,
      limitPercent,
      updatedAt: new Date().toISOString(),
    });
  }

  /** Sem limite configurado, o vendedor nao tem autonomia nenhuma — todo
   *  desconto negociado exige aprovacao (§6: "limite por vendedor"). */
  async getSellerDiscountLimit(tenantId: string, sellerId: string): Promise<number> {
    return (await this.readNumber(tenantId, 'limitesDeDesconto', sellerId, 'limitPercent')) ?? 0;
  }
}
