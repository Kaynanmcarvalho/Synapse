import { Injectable } from '@nestjs/common';
import type { Order, Page, Product } from '@synapse/types';
import { MAX_PAGE_LIMIT } from '@synapse/types';
import { PartnerService } from '../../catalog/services/partner.service';
import { ProductService } from '../../catalog/services/product.service';
import { TituloService } from '../../finance/services/titulo.service';
import { FiscalRepository } from '../../fiscal/repositories/fiscal.repository';
import type { TenantContext } from '../../iam/iam.types';
import { OrderService } from '../../sales/services/order.service';
import { PrefixIndex } from '../../../common/search/prefix-index';

export type SearchEntityType =
  'customer' | 'supplier' | 'product' | 'order' | 'fiscalDocument' | 'titulo';

export interface SearchResultItem {
  readonly type: SearchEntityType;
  readonly id: string;
  readonly title: string;
  readonly subtitle: string;
  readonly path: string;
}

export interface GlobalSearchResult {
  readonly items: readonly SearchResultItem[];
  /** §59 pede busca nas seis entidades do domínio; "vendedor" não entra
   *  ainda porque não existe, hoje, nenhum diretório de usuários/vendedores
   *  com nome pesquisável (só claims de autenticação e ids de membership) —
   *  fica aqui pra tela avisar em vez de fingir que buscou. */
  readonly unavailable: readonly string[];
}

const moneyFromCentavos = (centavos: number) =>
  new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(centavos / 100);

// Product.pricing usa reais (float), diferente de Titulo/PurchaseOrder (centavos
// inteiros) — a inconsistência já existe no domínio, esta função só respeita o
// que cada um guarda em vez de aplicar a mesma conversão nos dois.
const moneyFromReais = (reais: number) =>
  new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(reais);

/** `index.search` só devolve ids que vieram do próprio `byId` construído
 *  logo antes, mas o tipo de `Map.get` continua `T | undefined` — resolve
 *  isso filtrando em vez de afirmar com `!`, sem custo real já que a lista
 *  de ids buscados é sempre pequena (o `limit` da busca). */
function resolveIds<T>(ids: readonly string[], byId: ReadonlyMap<string, T>): T[] {
  const found: T[] = [];
  for (const id of ids) {
    const item = byId.get(id);
    if (item) found.push(item);
  }
  return found;
}

/** Constrói e consulta um `PrefixIndex` por request, a partir do que os
 *  repositórios (hoje, em memória) já têm. Reconstruir a cada busca é
 *  aceitável no volume de desenvolvimento atual — o ganho real de escala
 *  virá de alimentar o mesmo índice a partir de um gatilho de escrita do
 *  Firestore quando `Product`/`Customer`/etc. migrarem pra lá (ver nota em
 *  `ProductRepository`); o que este serviço já resolve, hoje, é trocar
 *  `.includes()` por token/prefixo em vez de comparar string inteira. */
@Injectable()
export class SearchService {
  constructor(
    private readonly products: ProductService,
    private readonly partners: PartnerService,
    private readonly orders: OrderService,
    private readonly fiscal: FiscalRepository,
    private readonly titulos: TituloService,
  ) {}

  async search(context: TenantContext, query: string, limit: number): Promise<GlobalSearchResult> {
    const [productItems, customerItems, supplierItems, orderItems, fiscalItems, tituloItems] =
      await Promise.all([
        this.searchProducts(context, query, limit),
        this.searchCustomers(context, query, limit),
        this.searchSuppliers(context, query, limit),
        this.searchOrders(context, query, limit),
        this.searchFiscalDocuments(context, query, limit),
        this.searchTitulos(context, query, limit),
      ]);

    return {
      items: [
        ...productItems,
        ...customerItems,
        ...supplierItems,
        ...orderItems,
        ...fiscalItems,
        ...tituloItems,
      ],
      unavailable: ['vendedor'],
    };
  }

  private async searchProducts(
    context: TenantContext,
    query: string,
    limit: number,
  ): Promise<SearchResultItem[]> {
    const products = await this.listAllProducts(context);
    const index = new PrefixIndex();
    for (const product of products) {
      index.add({ id: product.id, text: `${product.name} ${product.sku} ${product.ean ?? ''}` });
    }
    const byId = new Map(products.map((product) => [product.id, product]));
    return resolveIds(index.search(query, limit), byId).map((product) => ({
      type: 'product' as const,
      id: product.id,
      title: product.name,
      subtitle: `SKU ${product.sku} · ${moneyFromReais(product.pricing.salePrice)}`,
      path: '/cadastros/produtos',
    }));
  }

  private searchCustomers(
    context: TenantContext,
    query: string,
    limit: number,
  ): SearchResultItem[] {
    const customers = this.partners.searchCustomers(context.tenantId, '');
    const index = new PrefixIndex();
    for (const customer of customers) {
      index.add({ id: customer.id, text: `${customer.name} ${customer.taxId} ${customer.phone}` });
    }
    const byId = new Map(customers.map((customer) => [customer.id, customer]));
    return resolveIds(index.search(query, limit), byId).map((customer) => ({
      type: 'customer' as const,
      id: customer.id,
      title: customer.name,
      subtitle: customer.taxId,
      path: '/cadastros/clientes',
    }));
  }

  private searchSuppliers(
    context: TenantContext,
    query: string,
    limit: number,
  ): SearchResultItem[] {
    const suppliers = this.partners.searchSuppliers(context.tenantId, '');
    const index = new PrefixIndex();
    for (const supplier of suppliers) {
      index.add({
        id: supplier.id,
        text: `${supplier.tradeName} ${supplier.legalName} ${supplier.taxId}`,
      });
    }
    const byId = new Map(suppliers.map((supplier) => [supplier.id, supplier]));
    return resolveIds(index.search(query, limit), byId).map((supplier) => ({
      type: 'supplier' as const,
      id: supplier.id,
      title: supplier.tradeName,
      subtitle: supplier.taxId,
      path: '/compras',
    }));
  }

  private searchOrders(context: TenantContext, query: string, limit: number): SearchResultItem[] {
    const orders = this.orders.listByTenant(context.tenantId);
    const index = new PrefixIndex();
    for (const order of orders) {
      const itemNames = order.items.map((item) => item.description).join(' ');
      index.add({ id: order.id, text: `${order.id} ${order.customerId} ${itemNames}` });
    }
    const byId = new Map<string, Order>(orders.map((order) => [order.id, order]));
    return resolveIds(index.search(query, limit), byId).map((order) => ({
      type: 'order' as const,
      id: order.id,
      title: `Pedido ${order.id.slice(0, 8)}`,
      subtitle: `${order.status} · ${moneyFromCentavos(order.total)}`,
      path: '/vendas/pdv',
    }));
  }

  private searchFiscalDocuments(
    context: TenantContext,
    query: string,
    limit: number,
  ): SearchResultItem[] {
    const documents = this.fiscal.listByTenant(context.tenantId);
    const index = new PrefixIndex();
    for (const document of documents) {
      index.add({
        id: document.id,
        text: `${document.accessKey ?? ''} ${document.number} ${document.series} ${document.kind}`,
      });
    }
    const byId = new Map(documents.map((document) => [document.id, document]));
    return resolveIds(index.search(query, limit), byId).map((document) => ({
      type: 'fiscalDocument' as const,
      id: document.id,
      title: `${document.kind} nº ${document.number}`,
      subtitle: document.accessKey ?? document.status,
      path: '/vendas/pdv',
    }));
  }

  private async searchTitulos(
    context: TenantContext,
    query: string,
    limit: number,
  ): Promise<SearchResultItem[]> {
    const titulos = await this.titulos.listAll(context.tenantId);
    const index = new PrefixIndex();
    for (const titulo of titulos) {
      index.add({
        id: titulo.id,
        text: `${titulo.descricao} ${titulo.fornecedorId ?? ''} ${titulo.customerId ?? ''}`,
      });
    }
    const byId = new Map(titulos.map((titulo) => [titulo.id, titulo]));
    return resolveIds(index.search(query, limit), byId).map((titulo) => ({
      type: 'titulo' as const,
      id: titulo.id,
      title: titulo.descricao,
      subtitle: `${titulo.tipo} · ${moneyFromCentavos(titulo.valorOriginalCentavos)}`,
      path: '/compras',
    }));
  }

  private async listAllProducts(context: TenantContext): Promise<Product[]> {
    const items: Product[] = [];
    let cursor: string | undefined;
    for (let guard = 0; guard < 100; guard += 1) {
      const page: Page<Product> = this.products.search(context, {}, MAX_PAGE_LIMIT, cursor);
      items.push(...page.items);
      if (!page.hasMore || !page.nextCursor) break;
      cursor = page.nextCursor;
    }
    return items;
  }
}
