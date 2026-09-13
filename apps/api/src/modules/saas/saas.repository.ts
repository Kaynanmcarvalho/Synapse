import { Inject, Injectable } from '@nestjs/common';
import type { Firestore } from '@synapse/firebase/admin';
import type { TenantSubscription } from './saas.types';
import { FIREBASE_FIRESTORE } from '../iam/firebase.tokens';

@Injectable()
export class SaasRepository {
  constructor(@Inject(FIREBASE_FIRESTORE) private readonly firestore: Firestore) {}

  private doc(tenantId: string) {
    return this.firestore.doc(`saasSubscriptions/${tenantId}`);
  }

  async create(subscription: TenantSubscription): Promise<TenantSubscription> {
    await this.doc(subscription.tenantId).create(subscription);
    return subscription;
  }

  async save(subscription: TenantSubscription): Promise<TenantSubscription> {
    await this.doc(subscription.tenantId).set(subscription);
    return subscription;
  }

  async find(tenantId: string): Promise<TenantSubscription | undefined> {
    const snapshot = await this.doc(tenantId).get();
    return snapshot.exists ? (snapshot.data() as TenantSubscription) : undefined;
  }

  async list(): Promise<readonly TenantSubscription[]> {
    const snapshot = await this.firestore.collection('saasSubscriptions').get();
    return snapshot.docs
      .map((document) => document.data() as TenantSubscription)
      .sort((a, b) => a.name.localeCompare(b.name));
  }

  async mutate(
    tenantId: string,
    mutation: (current: TenantSubscription | undefined) => TenantSubscription,
  ): Promise<TenantSubscription> {
    const reference = this.doc(tenantId);
    return this.firestore.runTransaction(async (transaction) => {
      const snapshot = await transaction.get(reference);
      const current = snapshot.exists ? (snapshot.data() as TenantSubscription) : undefined;
      const next = mutation(current);
      transaction.set(reference, next);
      return next;
    });
  }
}
