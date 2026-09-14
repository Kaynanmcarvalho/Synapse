import { Inject, Injectable } from '@nestjs/common';
import type { Firestore, QueryDocumentSnapshot } from '@synapse/firebase/admin';
import type { Branch } from '@synapse/types';
import { FIREBASE_FIRESTORE } from '../firebase.tokens';

/** Filiais em `tenants/{t}/branches/{id}`. Antes era memoria: reiniciar a API
 *  apagava as filiais, e o PDV ficava sem onde abrir o caixa. */
@Injectable()
export class BranchRepository {
  constructor(@Inject(FIREBASE_FIRESTORE) private readonly db: Firestore) {}

  private collection(tenantId: string) {
    return this.db.collection(`tenants/${tenantId}/branches`);
  }

  async save(branch: Branch): Promise<Branch> {
    await this.collection(branch.tenantId).doc(branch.id).set(branch);
    return branch;
  }

  async findById(tenantId: string, id: string): Promise<Branch | undefined> {
    const snapshot = await this.collection(tenantId).doc(id).get();
    return snapshot.exists ? (snapshot.data() as Branch) : undefined;
  }

  /** Matriz primeiro, depois as filiais na ordem em que foram criadas. */
  async listByTenant(tenantId: string): Promise<Branch[]> {
    const snapshot = await this.collection(tenantId).get();
    return snapshot.docs
      .map((doc: QueryDocumentSnapshot) => doc.data() as Branch)
      .sort(
        (a, b) =>
          Number(b.isHeadquarters) - Number(a.isHeadquarters) ||
          (a.createdAt ?? '').localeCompare(b.createdAt ?? ''),
      );
  }

  async delete(tenantId: string, id: string): Promise<void> {
    await this.collection(tenantId).doc(id).delete();
  }
}
