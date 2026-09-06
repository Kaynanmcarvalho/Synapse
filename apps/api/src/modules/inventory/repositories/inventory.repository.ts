import { Inject, Injectable } from '@nestjs/common';
import type { Firestore } from '@synapse/firebase/admin';
import type { StockBalance, StockMovement } from '@synapse/types';
import { FIREBASE_FIRESTORE } from '../../iam/firebase.tokens';

@Injectable()
export class InventoryRepository {
  constructor(@Inject(FIREBASE_FIRESTORE) private readonly firestore: Firestore) {}
  async find(tenantId: string, branchId: string, warehouseId: string, productId: string) {
    const snapshot = await this.firestore
      .doc(`tenants/${tenantId}/inventory/${branchId}_${warehouseId}_${productId}`)
      .get();
    return snapshot.exists ? (snapshot.data() as StockBalance) : null;
  }
  async transact(
    tenantId: string,
    key: string,
    initial: StockBalance,
    operation: (before: StockBalance) => { balance: StockBalance; movement: StockMovement },
  ): Promise<StockBalance> {
    return this.firestore.runTransaction(async (transaction) => {
      const reference = this.firestore.doc(`tenants/${tenantId}/inventory/${key}`);
      const snapshot = await transaction.get(reference);
      const before = snapshot.exists ? (snapshot.data() as StockBalance) : initial;
      const { balance, movement } = operation(before);
      const idempotency = this.firestore.doc(
        `tenants/${tenantId}/inventoryIdempotency/${movement.idempotencyKey}`,
      );
      const repeated = await transaction.get(idempotency);
      if (repeated.exists) return repeated.data()?.['balance'] as StockBalance;
      transaction.set(reference, balance);
      transaction.create(
        this.firestore.doc(`tenants/${tenantId}/inventoryMovements/${movement.id}`),
        movement,
      );
      transaction.create(idempotency, {
        balance,
        movementId: movement.id,
        createdAt: movement.occurredAt,
      });
      return balance;
    });
  }
}
