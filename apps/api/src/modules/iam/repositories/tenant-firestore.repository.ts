import type { DocumentData, Firestore, QueryDocumentSnapshot } from '@synapse/firebase/admin';

export abstract class TenantFirestoreRepository<T extends DocumentData> {
  protected constructor(
    protected readonly db: Firestore,
    private readonly collectionName: string,
  ) {}

  protected collection(tenantId: string) {
    if (!tenantId) throw new Error('TenantContext obrigatório');
    return this.db.collection(`tenants/${tenantId}/${this.collectionName}`);
  }

  async findById(tenantId: string, id: string): Promise<T | null> {
    const snapshot = await this.collection(tenantId).doc(id).get();
    return snapshot.exists ? (snapshot.data() as T) : null;
  }

  async listByIds(tenantId: string, ids: readonly string[]): Promise<T[]> {
    if (ids.length === 0) return [];
    const snapshots = await this.collection(tenantId)
      .where('__name__', 'in', [...ids])
      .get();
    return snapshots.docs.map((document: QueryDocumentSnapshot) => document.data() as T);
  }
}
