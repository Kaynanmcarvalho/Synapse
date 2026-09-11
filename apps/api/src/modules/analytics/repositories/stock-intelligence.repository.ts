import { Inject, Injectable } from '@nestjs/common';
import type { Firestore, QueryDocumentSnapshot } from '@synapse/firebase/admin';
import type { StockBalance, StockIntelligenceMetric, StockMovement } from '@synapse/types';
import { FIREBASE_FIRESTORE } from '../../iam/firebase.tokens';

@Injectable()
export class StockIntelligenceRepository {
  constructor(@Inject(FIREBASE_FIRESTORE) private readonly firestore: Firestore) {}

  /** Todo tenant com um documento na coleção raiz — não há um registro
   *  central de tenants em memória, só o Firestore sabe quais existem. É o
   *  que o job periódico percorre para recalcular tenant por tenant. */
  async listTenantIds(): Promise<string[]> {
    const snapshot = await this.firestore.collection('tenants').get();
    return snapshot.docs.map((document: QueryDocumentSnapshot) => document.id);
  }

  /** Todo saldo do tenant, sem filtro de filial — usado só para descobrir
   *  quais filiais têm estoque de fato antes de recalcular cada uma. */
  async listAllBalances(tenantId: string): Promise<StockBalance[]> {
    const snapshot = await this.firestore.collection(`tenants/${tenantId}/inventory`).get();
    return snapshot.docs.map((document: QueryDocumentSnapshot) => document.data() as StockBalance);
  }

  /** Saldo atual de cada produto na filial — a mesma coleção que
   *  `InventoryRepository.transact` escreve (`tenants/{t}/inventory`). */
  async listBalances(tenantId: string, branchId: string): Promise<StockBalance[]> {
    const snapshot = await this.firestore
      .collection(`tenants/${tenantId}/inventory`)
      .where('branchId', '==', branchId)
      .get();
    return snapshot.docs.map((document: QueryDocumentSnapshot) => document.data() as StockBalance);
  }

  /** Movimentos de venda da filial dentro da janela — a base do giro, da
   *  cobertura e da detecção de ruptura (§38). Duas igualdades mais um
   *  intervalo: exige o índice composto declarado em firestore.indexes.json. */
  async listSalesMovements(
    tenantId: string,
    branchId: string,
    sinceIso: string,
  ): Promise<StockMovement[]> {
    const snapshot = await this.firestore
      .collection(`tenants/${tenantId}/inventoryMovements`)
      .where('branchId', '==', branchId)
      .where('kind', '==', 'SALE')
      .where('occurredAt', '>=', sinceIso)
      .get();
    return snapshot.docs.map((document: QueryDocumentSnapshot) => document.data() as StockMovement);
  }

  /** Grava a leva inteira de indicadores recalculados. Firestore limita 500
   *  escritas por batch — divide em blocos de 450 pra sobrar folga. */
  async saveMetrics(tenantId: string, metrics: readonly StockIntelligenceMetric[]): Promise<void> {
    const chunkSize = 450;
    for (let start = 0; start < metrics.length; start += chunkSize) {
      const batch = this.firestore.batch();
      for (const metric of metrics.slice(start, start + chunkSize)) {
        batch.set(this.firestore.doc(`tenants/${tenantId}/stockIntelligence/${metric.id}`), metric);
      }
      await batch.commit();
    }
  }

  async list(tenantId: string, branchId: string): Promise<StockIntelligenceMetric[]> {
    const snapshot = await this.firestore
      .collection(`tenants/${tenantId}/stockIntelligence`)
      .where('branchId', '==', branchId)
      .get();
    return snapshot.docs.map(
      (document: QueryDocumentSnapshot) => document.data() as StockIntelligenceMetric,
    );
  }

  async findOne(tenantId: string, id: string): Promise<StockIntelligenceMetric | null> {
    const snapshot = await this.firestore.doc(`tenants/${tenantId}/stockIntelligence/${id}`).get();
    return snapshot.exists ? (snapshot.data() as StockIntelligenceMetric) : null;
  }

  async saveAdjustment(
    tenantId: string,
    id: string,
    patch: Pick<
      StockIntelligenceMetric,
      'approvedPurchaseQty' | 'adjustedBy' | 'adjustedAt' | 'adjustmentNote'
    >,
  ): Promise<void> {
    await this.firestore
      .doc(`tenants/${tenantId}/stockIntelligence/${id}`)
      .set(patch, { merge: true });
  }
}
