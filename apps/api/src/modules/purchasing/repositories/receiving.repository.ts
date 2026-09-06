import { Inject, Injectable } from '@nestjs/common';
import type { Firestore, QueryDocumentSnapshot } from '@synapse/firebase/admin';
import type { Receiving, StockBalance } from '@synapse/types';
import { FIREBASE_FIRESTORE } from '../../iam/firebase.tokens';

@Injectable()
export class ReceivingRepository {
  constructor(@Inject(FIREBASE_FIRESTORE) private readonly firestore: Firestore) {}

  private collection(tenantId: string) {
    return this.firestore.collection(`tenants/${tenantId}/receivings`);
  }

  /** Saldo atual, para o custo médio ponderado (§40) saber quanto já havia
   *  em estoque antes desta remessa chegar. Mesma coleção e mesma chave que
   *  `InventoryService`/`InventoryRepository` usam — só leitura, a escrita
   *  continua exclusiva do módulo de estoque (via `movement/INBOUND`). */
  async getBalance(
    tenantId: string,
    branchId: string,
    warehouseId: string,
    productId: string,
  ): Promise<StockBalance | null> {
    const key = `${branchId}_${warehouseId}_${productId}`;
    const snapshot = await this.firestore.doc(`tenants/${tenantId}/inventory/${key}`).get();
    return snapshot.exists ? (snapshot.data() as StockBalance) : null;
  }

  async create(tenantId: string, receiving: Receiving): Promise<Receiving> {
    await this.collection(tenantId).doc(receiving.id).create(receiving);
    return receiving;
  }

  async listByPurchaseOrder(tenantId: string, purchaseOrderId: string): Promise<Receiving[]> {
    const snapshot = await this.collection(tenantId)
      .where('purchaseOrderId', '==', purchaseOrderId)
      .get();
    return snapshot.docs.map((document: QueryDocumentSnapshot) => document.data() as Receiving);
  }

  /** Todo recebimento de um fornecedor — a base do histórico de preço por
   *  produto (§40): cada linha carrega o custo realmente pago naquela
   *  remessa, não o cotado. */
  async listBySupplier(tenantId: string, supplierId: string): Promise<Receiving[]> {
    const snapshot = await this.collection(tenantId).where('supplierId', '==', supplierId).get();
    return snapshot.docs.map((document: QueryDocumentSnapshot) => document.data() as Receiving);
  }
}
