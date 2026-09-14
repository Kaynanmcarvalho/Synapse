import { Inject, Injectable } from '@nestjs/common';
import type { Firestore, QueryDocumentSnapshot } from '@synapse/firebase/admin';
import type { Page, Product } from '@synapse/types';
import { searchTerms, searchTokens } from '../../../common/search/search-tokens';
import { FIREBASE_FIRESTORE } from '../../iam/firebase.tokens';

export interface ProductSearchFilter {
  readonly q?: string;
  readonly status?: Product['status'];
  readonly categoryId?: string;
}

/** Quantos documentos a busca por texto le antes de filtrar status e categoria
 *  em memoria: o Firestore nao combina `array-contains` com outros filtros sem
 *  indice composto para cada combinacao. */
const LEITURA_DA_BUSCA = 300;

type ProdutoGravado = Product & { readonly searchTokens?: readonly string[] };

/** O que o balcao digita para achar o produto: nome, SKU, codigo interno,
 *  codigo de barras, marca e descricao curta. */
const textoDeBusca = (product: Product): string =>
  [
    product.name,
    product.sku,
    product.internalCode ?? '',
    product.ean ?? '',
    product.brand ?? '',
    product.shortDescription ?? '',
  ].join(' ');

const doGravado = (dados: unknown): Product => {
  const { searchTokens: _tokens, ...product } = dados as ProdutoGravado;
  return product;
};

/** O catalogo de produtos em `tenants/{t}/products/{id}`.
 *
 *  Antes ficava num `Map` em memoria: reiniciar a API apagava o catalogo, e o
 *  PDV vendia produto que nao existia mais. Agora a tela de produtos, o PDV, o
 *  Ponto de Vendas, a busca global, as compras e a inteligencia de estoque leem
 *  deste mesmo documento. */
@Injectable()
export class ProductRepository {
  constructor(@Inject(FIREBASE_FIRESTORE) private readonly db: Firestore) {}

  private collection(tenantId: string) {
    return this.db.collection(`tenants/${tenantId}/products`);
  }

  async save(product: Product): Promise<Product> {
    await this.collection(product.tenantId)
      .doc(product.id)
      .set({ ...product, searchTokens: searchTokens(textoDeBusca(product)) });
    return product;
  }

  async findById(tenantId: string, id: string): Promise<Product | undefined> {
    const snapshot = await this.collection(tenantId).doc(id).get();
    return snapshot.exists ? doGravado(snapshot.data()) : undefined;
  }

  /** Varios de uma vez, numa ida so: o pedido e a venda precisam de todos os
   *  itens para conferir preco e status. */
  async findMany(tenantId: string, ids: readonly string[]): Promise<ReadonlyMap<string, Product>> {
    const unicos = [...new Set(ids)].filter(Boolean);
    if (unicos.length === 0) return new Map();
    const snapshots = await this.db.getAll(
      ...unicos.map((id) => this.collection(tenantId).doc(id)),
    );
    return new Map(
      snapshots.flatMap((snapshot) =>
        snapshot.exists ? [[snapshot.id, doGravado(snapshot.data())] as const] : [],
      ),
    );
  }

  async findBySku(tenantId: string, sku: string): Promise<Product | undefined> {
    const result = await this.collection(tenantId).where('sku', '==', sku).limit(1).get();
    const [first] = result.docs;
    return first ? doGravado(first.data()) : undefined;
  }

  /** Codigo interno: o que vai na etiqueta da balanca e o balcao digita. */
  async findByInternalCode(tenantId: string, codigo: string): Promise<Product | undefined> {
    const result = await this.collection(tenantId)
      .where('internalCode', '==', codigo)
      .limit(1)
      .get();
    const [first] = result.docs;
    return first ? doGravado(first.data()) : undefined;
  }

  /** Codigo de barras lido no balcao ou no PDV. */
  async findByEan(tenantId: string, ean: string): Promise<Product | undefined> {
    const result = await this.collection(tenantId).where('ean', '==', ean).limit(1).get();
    const [first] = result.docs;
    return first ? doGravado(first.data()) : undefined;
  }

  async delete(tenantId: string, id: string): Promise<void> {
    await this.collection(tenantId).doc(id).delete();
  }

  /** Lista por nome, paginando pelo id do ultimo lido. Com texto, procura por
   *  prefixo de palavra (e por SKU ou codigo de barras exatos) e devolve uma
   *  pagina so — e o que a caixa de busca precisa. */
  async search(
    tenantId: string,
    filter: ProductSearchFilter,
    limit: number,
    cursor?: string,
  ): Promise<Page<Product>> {
    const texto = filter.q?.trim();
    if (texto) return this.searchText(tenantId, texto, filter, limit);

    let query = this.collection(tenantId)
      .orderBy('name')
      .limit(limit + 1);
    if (filter.status) query = query.where('status', '==', filter.status);
    if (filter.categoryId) query = query.where('categoryId', '==', filter.categoryId);
    if (cursor) {
      const anchor = await this.collection(tenantId).doc(cursor).get();
      if (anchor.exists) query = query.startAfter(anchor);
    }
    const docs = (await query.get()).docs as QueryDocumentSnapshot[];
    const items = docs.slice(0, limit).map((doc) => doGravado(doc.data()));
    const hasMore = docs.length > limit;
    return { items, nextCursor: hasMore ? (items.at(-1)?.id ?? null) : null, hasMore };
  }

  /** O catalogo inteiro, para agregacao interna (inteligencia de estoque,
   *  recalculo de custo). Nunca para resposta de API. */
  async listAll(tenantId: string, max = 20_000): Promise<Product[]> {
    const snapshot = await this.collection(tenantId).limit(max).get();
    return snapshot.docs.map((doc: QueryDocumentSnapshot) => doGravado(doc.data()));
  }

  private async searchText(
    tenantId: string,
    texto: string,
    filter: ProductSearchFilter,
    limit: number,
  ): Promise<Page<Product>> {
    const cabe = (product: Product) =>
      (!filter.status || product.status === filter.status) &&
      (!filter.categoryId || product.categoryId === filter.categoryId);

    const exatos = await Promise.all([
      this.findBySku(tenantId, texto),
      this.findBySku(tenantId, texto.toUpperCase()),
      /^\d{8,14}$/.test(texto) ? this.findByEan(tenantId, texto) : undefined,
    ]);
    const achados = new Map<string, Product>();
    for (const product of exatos) if (product && cabe(product)) achados.set(product.id, product);

    const termos = searchTerms(texto).slice(0, 10);
    const [primeiro, ...demais] = termos;
    if (primeiro) {
      const result = await this.collection(tenantId)
        .where('searchTokens', 'array-contains', primeiro)
        .limit(LEITURA_DA_BUSCA)
        .get();
      const porNome = result.docs
        .map((doc: QueryDocumentSnapshot) => doc.data() as ProdutoGravado)
        .filter((gravado) => demais.every((termo) => gravado.searchTokens?.includes(termo)))
        .map(doGravado)
        .filter(cabe)
        .sort((a, b) => a.name.localeCompare(b.name, 'pt-BR'));
      for (const product of porNome) achados.set(product.id, product);
    }
    const items = [...achados.values()];
    return { items: items.slice(0, limit), nextCursor: null, hasMore: items.length > limit };
  }
}
