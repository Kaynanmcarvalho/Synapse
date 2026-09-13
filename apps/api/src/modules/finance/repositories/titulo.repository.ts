import { Inject, Injectable } from '@nestjs/common';
import type { Firestore, QueryDocumentSnapshot } from '@synapse/firebase/admin';
import type { Titulo } from '@synapse/types';
import { FIREBASE_FIRESTORE } from '../../iam/firebase.tokens';
import { searchTerms, searchTokens } from '../../../common/search/search-tokens';

/** Persistência do domínio de Titulo (contas a receber e a pagar, §24/§25).
 *  A lógica de negócio (saldo, status, renegociação) já existe em
 *  `entities/titulo.ts`, pura e sem I/O — este repositório só guarda e lê. */
@Injectable()
export class TituloRepository {
  constructor(@Inject(FIREBASE_FIRESTORE) private readonly firestore: Firestore) {}

  private collection(tenantId: string) {
    return this.firestore.collection(`tenants/${tenantId}/titulos`);
  }

  async create(tenantId: string, titulo: Titulo): Promise<Titulo> {
    await this.collection(tenantId)
      .doc(titulo.id)
      .create({ ...titulo, searchTokens: this.tokens(titulo) });
    return titulo;
  }

  async findById(tenantId: string, id: string): Promise<Titulo | null> {
    const snapshot = await this.collection(tenantId).doc(id).get();
    return snapshot.exists ? (snapshot.data() as Titulo) : null;
  }

  async update(tenantId: string, titulo: Titulo): Promise<Titulo> {
    await this.collection(tenantId)
      .doc(titulo.id)
      .set({ ...titulo, searchTokens: this.tokens(titulo) });
    return titulo;
  }

  async listByFornecedor(tenantId: string, fornecedorId: string): Promise<Titulo[]> {
    const snapshot = await this.collection(tenantId)
      .where('fornecedorId', '==', fornecedorId)
      .get();
    return snapshot.docs.map((document: QueryDocumentSnapshot) => document.data() as Titulo);
  }

  /** Todos os titulos de um cliente — a ficha que a analise de credito le. */
  async listByCliente(tenantId: string, customerId: string): Promise<Titulo[]> {
    const snapshot = await this.collection(tenantId).where('customerId', '==', customerId).get();
    return snapshot.docs.map((document: QueryDocumentSnapshot) => document.data() as Titulo);
  }

  async listAll(tenantId: string): Promise<Titulo[]> {
    const snapshot = await this.collection(tenantId).get();
    return snapshot.docs.map((document: QueryDocumentSnapshot) => document.data() as Titulo);
  }

  private tokens(titulo: Titulo) {
    return searchTokens(
      `${titulo.id} ${titulo.descricao} ${titulo.customerId ?? ''} ${titulo.fornecedorId ?? ''}`,
    );
  }

  async search(tenantId: string, query: string, limit: number): Promise<Titulo[]> {
    const terms = searchTerms(query).slice(0, 10);
    if (!terms.length) return [];
    const result = await this.collection(tenantId)
      .where('searchTokens', 'array-contains-any', terms)
      .limit(limit)
      .get();
    return result.docs.map((doc: QueryDocumentSnapshot) => doc.data() as Titulo);
  }
}
