import { Inject, Injectable } from '@nestjs/common';
import type { Firestore, QueryDocumentSnapshot } from '@synapse/firebase/admin';
import type { Category } from '@synapse/types';
import { FIREBASE_FIRESTORE } from '../../iam/firebase.tokens';

/** Categorias do catalogo em `tenants/{t}/categories/{id}`. */
@Injectable()
export class CategoryRepository {
  constructor(@Inject(FIREBASE_FIRESTORE) private readonly db: Firestore) {}

  private collection(tenantId: string) {
    return this.db.collection(`tenants/${tenantId}/categories`);
  }

  async save(category: Category): Promise<Category> {
    await this.collection(category.tenantId).doc(category.id).set(category);
    return category;
  }

  async findById(tenantId: string, id: string): Promise<Category | undefined> {
    const snapshot = await this.collection(tenantId).doc(id).get();
    return snapshot.exists ? (snapshot.data() as Category) : undefined;
  }

  async listByTenant(tenantId: string): Promise<Category[]> {
    const snapshot = await this.collection(tenantId).get();
    return snapshot.docs
      .map((doc: QueryDocumentSnapshot) => doc.data() as Category)
      .sort((a, b) => a.name.localeCompare(b.name, 'pt-BR'));
  }
}
