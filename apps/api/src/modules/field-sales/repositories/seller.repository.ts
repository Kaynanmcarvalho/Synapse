import { Inject, Injectable } from '@nestjs/common';
import type { Firestore, QueryDocumentSnapshot } from '@synapse/firebase/admin';
import type { Seller } from '@synapse/types';
import { FIREBASE_FIRESTORE } from '../../iam/firebase.tokens';

@Injectable()
export class SellerRepository {
  constructor(@Inject(FIREBASE_FIRESTORE) private readonly firestore: Firestore) {}

  private collection(tenantId: string) {
    return this.firestore.collection(`tenants/${tenantId}/sellers`);
  }

  async create(tenantId: string, seller: Seller): Promise<Seller> {
    await this.collection(tenantId).doc(seller.id).set(seller);
    return seller;
  }

  async findById(tenantId: string, id: string): Promise<Seller | null> {
    const snapshot = await this.collection(tenantId).doc(id).get();
    return snapshot.exists ? (snapshot.data() as Seller) : null;
  }

  async update(tenantId: string, seller: Seller): Promise<Seller> {
    await this.collection(tenantId).doc(seller.id).set(seller);
    return seller;
  }

  async listByTenant(tenantId: string): Promise<Seller[]> {
    const snapshot = await this.collection(tenantId).get();
    return snapshot.docs.map((document: QueryDocumentSnapshot) => document.data() as Seller);
  }
}
