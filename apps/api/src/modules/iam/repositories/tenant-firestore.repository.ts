import type { DocumentData, Firestore, QueryDocumentSnapshot } from '@synapse/firebase/admin';

/** Limite do operador `in` do Firestore. */
const TAMANHO_DO_LOTE_IN = 30;

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

  /** O operador `in` do Firestore aceita no maximo 30 valores por consulta,
   *  entao a lista vai em lotes — acima disso a consulta unica falharia. */
  async listByIds(tenantId: string, ids: readonly string[]): Promise<T[]> {
    if (ids.length === 0) return [];
    const collection = this.collection(tenantId);

    const lotes: string[][] = [];
    for (let i = 0; i < ids.length; i += TAMANHO_DO_LOTE_IN) {
      lotes.push(ids.slice(i, i + TAMANHO_DO_LOTE_IN));
    }

    const resultados = await Promise.all(
      lotes.map((lote) => collection.where('__name__', 'in', lote).get()),
    );
    return resultados.flatMap((snapshot) =>
      snapshot.docs.map((document: QueryDocumentSnapshot) => document.data() as T),
    );
  }
}
