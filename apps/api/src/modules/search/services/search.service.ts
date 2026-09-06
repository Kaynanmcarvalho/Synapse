import { Injectable } from '@nestjs/common';
import type { Permission } from '@synapse/types';
import { ProductRepository } from '../../catalog/repositories/product.repository';
import { PartnerRepository } from '../../catalog/repositories/partner.repository';
import { OrderRepository } from '../../sales/repositories/order.repository';
import { FiscalRepository } from '../../fiscal/repositories/fiscal.repository';
import { TituloRepository } from '../../finance/repositories/titulo.repository';
import { SellerRepository } from '../../field-sales/repositories/seller.repository';
import { RoleService } from '../../iam/services/role.service';
import type { TenantContext } from '../../iam/iam.types';

export type SearchEntityType =
  'customer' | 'supplier' | 'product' | 'order' | 'fiscalDocument' | 'titulo' | 'seller';
export interface SearchResultItem {
  readonly type: SearchEntityType;
  readonly id: string;
  readonly title: string;
  readonly subtitle: string;
  readonly path: string;
}
export interface GlobalSearchResult {
  readonly items: readonly SearchResultItem[];
  readonly unavailable: readonly string[];
}

/** Índices alimentados na escrita. Nenhuma listagem integral durante a busca. */
@Injectable()
export class SearchService {
  constructor(
    private readonly products: ProductRepository,
    private readonly partners: PartnerRepository,
    private readonly orders: OrderRepository,
    private readonly fiscal: FiscalRepository,
    private readonly titulos: TituloRepository,
    private readonly sellers: SellerRepository,
    private readonly roles: RoleService,
  ) {}

  async search(context: TenantContext, query: string, limit: number): Promise<GlobalSearchResult> {
    const items: SearchResultItem[] = [];
    const allowed = (permission: Permission) => this.roles.hasPermission(context, permission);
    const branchAllowed = (branchId: string) =>
      !context.branchIds.length || context.branchIds.includes(branchId);

    if (allowed('produto.visualizar')) items.push(...this.searchProducts(context, query, limit));
    if (allowed('cliente.gerenciar')) items.push(...this.searchCustomers(context, query, limit));
    if (allowed('fornecedor.gerenciar')) items.push(...this.searchSuppliers(context, query, limit));
    if (allowed('venda.criar'))
      items.push(...this.searchOrders(context, query, limit, branchAllowed));
    if (allowed('fiscal.visualizar'))
      items.push(...this.searchFiscalDocuments(context, query, limit));
    if (allowed('financeiro.visualizar'))
      items.push(...(await this.searchTitulos(context, query, limit, branchAllowed)));
    if (allowed('vendedor.gerenciar'))
      items.push(...(await this.searchSellers(context, query, limit, branchAllowed)));

    return { items, unavailable: [] };
  }

  private searchProducts(context: TenantContext, query: string, limit: number): SearchResultItem[] {
    return this.products.searchIndex
      .search(context.tenantId, query, limit)
      .map((p) => ({
        type: 'product' as const,
        id: p.id,
        title: p.name,
        subtitle: p.sku,
        path: '/cadastros/produtos',
      }));
  }

  private searchCustomers(
    context: TenantContext,
    query: string,
    limit: number,
  ): SearchResultItem[] {
    return this.partners.customerIndex
      .search(context.tenantId, query, limit)
      .map((c) => ({
        type: 'customer' as const,
        id: c.id,
        title: c.name,
        subtitle: c.taxId,
        path: '/cadastros/clientes',
      }));
  }

  private searchSuppliers(
    context: TenantContext,
    query: string,
    limit: number,
  ): SearchResultItem[] {
    return this.partners.supplierIndex
      .search(context.tenantId, query, limit)
      .map((s) => ({
        type: 'supplier' as const,
        id: s.id,
        title: s.tradeName,
        subtitle: s.taxId,
        path: '/compras',
      }));
  }

  private searchOrders(
    context: TenantContext,
    query: string,
    limit: number,
    branchAllowed: (branchId: string) => boolean,
  ): SearchResultItem[] {
    return this.orders.searchIndex
      .search(context.tenantId, query, limit)
      .filter((o) => branchAllowed(o.branchId))
      .map((o) => ({
        type: 'order' as const,
        id: o.id,
        title: `Pedido ${o.id.slice(0, 8)}`,
        subtitle: o.status,
        path: '/vendas/pdv',
      }));
  }

  private searchFiscalDocuments(
    context: TenantContext,
    query: string,
    limit: number,
  ): SearchResultItem[] {
    return this.fiscal.searchIndex.search(context.tenantId, query, limit).map((d) => ({
      type: 'fiscalDocument' as const,
      id: d.id,
      title: `${d.kind} nº ${d.number}`,
      subtitle: d.accessKey ?? d.status,
      path: '/vendas/pdv',
    }));
  }

  private async searchTitulos(
    context: TenantContext,
    query: string,
    limit: number,
    branchAllowed: (branchId: string) => boolean,
  ): Promise<SearchResultItem[]> {
    const titulos = await this.titulos.search(context.tenantId, query, limit);
    return titulos
      .filter((t) => branchAllowed(t.branchId))
      .map((t) => ({
        type: 'titulo' as const,
        id: t.id,
        title: t.descricao,
        subtitle: t.tipo,
        path: '/financeiro/boletos',
      }));
  }

  private async searchSellers(
    context: TenantContext,
    query: string,
    limit: number,
    branchAllowed: (branchId: string) => boolean,
  ): Promise<SearchResultItem[]> {
    const sellers = await this.sellers.search(context.tenantId, query, limit);
    return sellers
      .filter((s) => s.active && branchAllowed(s.branchId))
      .map((s) => ({
        type: 'seller' as const,
        id: s.id,
        title: s.name,
        subtitle: s.region,
        path: '/cadastros/vendedores',
      }));
  }
}
