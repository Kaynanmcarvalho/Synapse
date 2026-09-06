import { Inject, Injectable } from '@nestjs/common';
import type { Firestore, QueryDocumentSnapshot } from '@synapse/firebase/admin';
import type { SavedFilter } from '@synapse/types';
import { FIREBASE_FIRESTORE } from '../../iam/firebase.tokens';

@Injectable()
export class SavedFilterRepository {
  constructor(@Inject(FIREBASE_FIRESTORE) private readonly firestore: Firestore) {}

  private collection(tenantId: string) {
    return this.firestore.collection(`tenants/${tenantId}/savedFilters`);
  }

  async create(tenantId: string, filter: SavedFilter): Promise<SavedFilter> {
    await this.collection(tenantId).doc(filter.id).create(filter);
    return filter;
  }

  async listByUserAndScreen(
    tenantId: string,
    userId: string,
    screen: string,
  ): Promise<SavedFilter[]> {
    const snapshot = await this.collection(tenantId)
      .where('userId', '==', userId)
      .where('screen', '==', screen)
      .get();
    return snapshot.docs.map((document: QueryDocumentSnapshot) => document.data() as SavedFilter);
  }

  async delete(tenantId: string, id: string): Promise<void> {
    await this.collection(tenantId).doc(id).delete();
  }

  async findById(tenantId: string, id: string): Promise<SavedFilter | null> {
    const snapshot = await this.collection(tenantId).doc(id).get();
    return snapshot.exists ? (snapshot.data() as SavedFilter) : null;
  }
}
