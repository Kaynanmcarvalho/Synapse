import { Inject, Injectable } from '@nestjs/common';
import type { Firestore } from '@synapse/firebase/admin';
import type { TenantExperience } from './feature.types';
import { FIREBASE_FIRESTORE } from '../iam/firebase.tokens';

@Injectable()
export class FeatureRepository {
  constructor(@Inject(FIREBASE_FIRESTORE) private readonly firestore: Firestore) {}

  async find(tenantId: string): Promise<TenantExperience | undefined> {
    const snapshot = await this.firestore.doc(`tenantExperiences/${tenantId}`).get();
    return snapshot.exists ? (snapshot.data() as TenantExperience) : undefined;
  }
  async save(value: TenantExperience): Promise<TenantExperience> {
    await this.firestore.doc(`tenantExperiences/${value.tenantId}`).set(value);
    return value;
  }

  async mutate(
    tenantId: string,
    fallback: TenantExperience,
    mutation: (current: TenantExperience) => TenantExperience,
  ): Promise<TenantExperience> {
    const reference = this.firestore.doc(`tenantExperiences/${tenantId}`);
    return this.firestore.runTransaction(async (transaction) => {
      const snapshot = await transaction.get(reference);
      const current = snapshot.exists ? (snapshot.data() as TenantExperience) : fallback;
      const next = mutation(current);
      transaction.set(reference, next);
      return next;
    });
  }
}
