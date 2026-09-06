import { Injectable } from '@nestjs/common';
import type { Page, Product } from '@synapse/types';

export interface ProductSearchFilter {
  readonly q?: string;
  readonly status?: Product['status'];
  readonly categoryId?: string;
}

/** Em memoria, na mesma linha de PartnerRepository — troca por Firestore
 *  quando o volume real (100 mil+ produtos, §5) exigir consulta indexada.
 *  O contrato de paginacao por cursor ja fica pronto para essa troca. */
@Injectable()
export class ProductRepository {
  private readonly products = new Map<string, Product>();
  /** Ordem de insercao, por tenant — e o que o cursor de paginacao anda. */
  private readonly order = new Map<string, string[]>();

  private key(tenantId: string, id: string): string {
    return `${tenantId}:${id}`;
  }

  save(product: Product): Product {
    const key = this.key(product.tenantId, product.id);
    if (!this.products.has(key)) {
      const ids = this.order.get(product.tenantId) ?? [];
      ids.push(product.id);
      this.order.set(product.tenantId, ids);
    }
    this.products.set(key, product);
    return product;
  }

  findById(tenantId: string, id: string): Product | undefined {
    return this.products.get(this.key(tenantId, id));
  }

  findBySku(tenantId: string, sku: string): Product | undefined {
    return [...this.products.values()].find(
      (product) => product.tenantId === tenantId && product.sku === sku,
    );
  }

  delete(tenantId: string, id: string): void {
    this.products.delete(this.key(tenantId, id));
    const ids = this.order.get(tenantId);
    if (ids)
      this.order.set(
        tenantId,
        ids.filter((existing) => existing !== id),
      );
  }

  search(
    tenantId: string,
    filter: ProductSearchFilter,
    limit: number,
    cursor?: string,
  ): Page<Product> {
    const ids = this.order.get(tenantId) ?? [];
    const cursorIndex = cursor ? ids.indexOf(cursor) : -1;
    let index = cursorIndex === -1 ? 0 : cursorIndex + 1;

    const matches: Product[] = [];
    let lastMatchedId: string | null = null;

    for (; index < ids.length; index += 1) {
      if (matches.length === limit) break;
      const productId = ids[index];
      const product = productId ? this.products.get(this.key(tenantId, productId)) : undefined;
      if (!product || !this.matches(product, filter)) continue;
      matches.push(product);
      lastMatchedId = product.id;
    }

    const hasMore = this.hasMatchFrom(tenantId, ids, index, filter);
    return { items: matches, nextCursor: hasMore ? lastMatchedId : null, hasMore };
  }

  private hasMatchFrom(
    tenantId: string,
    ids: readonly string[],
    fromIndex: number,
    filter: ProductSearchFilter,
  ): boolean {
    for (let i = fromIndex; i < ids.length; i += 1) {
      const productId = ids[i];
      const product = productId ? this.products.get(this.key(tenantId, productId)) : undefined;
      if (product && this.matches(product, filter)) return true;
    }
    return false;
  }

  private matches(product: Product, filter: ProductSearchFilter): boolean {
    if (filter.status && product.status !== filter.status) return false;
    if (filter.categoryId && product.categoryId !== filter.categoryId) return false;
    if (filter.q) {
      const term = filter.q.toLocaleLowerCase('pt-BR');
      const haystack = [product.sku, product.name, product.ean ?? '', product.internalCode ?? '']
        .join(' ')
        .toLocaleLowerCase('pt-BR');
      if (!haystack.includes(term)) return false;
    }
    return true;
  }
}
