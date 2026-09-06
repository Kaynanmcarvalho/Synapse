import { Inject, Injectable } from '@nestjs/common';
import type { Firestore, QueryDocumentSnapshot } from '@synapse/firebase/admin';
import type { PurchaseOrder, PurchaseOrderStatus } from '@synapse/types';
import { FIREBASE_FIRESTORE } from '../../iam/firebase.tokens';

@Injectable()
export class PurchaseOrderRepository {
  constructor(@Inject(FIREBASE_FIRESTORE) private readonly firestore: Firestore) {}

  private collection(tenantId: string) {
    return this.firestore.collection(`tenants/${tenantId}/purchaseOrders`);
  }

  async create(tenantId: string, order: PurchaseOrder): Promise<PurchaseOrder> {
    await this.collection(tenantId).doc(order.id).create(order);
    return order;
  }

  async findById(tenantId: string, id: string): Promise<PurchaseOrder | null> {
    const snapshot = await this.collection(tenantId).doc(id).get();
    return snapshot.exists ? (snapshot.data() as PurchaseOrder) : null;
  }

  /** Escrita otimista: quem chama já releu o pedido antes de mutar, então
   *  o `expectedVersion` aqui é só a última linha de defesa contra uma
   *  corrida entre duas abas/pessoas editando o mesmo pedido. */
  async update(
    tenantId: string,
    order: PurchaseOrder,
    expectedVersion: number,
  ): Promise<PurchaseOrder> {
    return this.firestore.runTransaction(async (transaction) => {
      const reference = this.collection(tenantId).doc(order.id);
      const snapshot = await transaction.get(reference);
      const current = snapshot.exists ? (snapshot.data() as PurchaseOrder) : null;
      if (!current || current.version !== expectedVersion) {
        throw new Error('CONFLICT');
      }
      transaction.set(reference, order);
      return order;
    });
  }

  async list(tenantId: string, branchId: string, status?: PurchaseOrderStatus) {
    let query = this.collection(tenantId).where('branchId', '==', branchId);
    if (status) query = query.where('status', '==', status);
    const snapshot = await query.get();
    return snapshot.docs.map((document: QueryDocumentSnapshot) => document.data() as PurchaseOrder);
  }

  /** Todos os pedidos já recebidos (ao menos uma vez) de um fornecedor, para
   *  o histórico de preço por produto (§40) — não filtra por status porque
   *  um RECEBIDO_PARCIAL já tem preço real pago, não só cotado. */
  async listReceivedFromSupplier(tenantId: string, supplierId: string) {
    const snapshot = await this.collection(tenantId).where('supplierId', '==', supplierId).get();
    return snapshot.docs
      .map((document: QueryDocumentSnapshot) => document.data() as PurchaseOrder)
      .filter((order) => order.status === 'RECEBIDO' || order.status === 'RECEBIDO_PARCIAL');
  }
}
