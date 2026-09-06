import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import type { Page, Product, StockIntelligenceMetric, Supplier } from '@synapse/types';
import { MAX_PAGE_LIMIT } from '@synapse/types';
import { PartnerService } from '../../catalog/services/partner.service';
import { ProductService } from '../../catalog/services/product.service';
import type { TenantContext } from '../../iam/iam.types';
import type {
  AdjustSuggestionInput,
  ListStockIntelligenceQuery,
} from '../dto/stock-intelligence.schemas';
import { StockIntelligenceRepository } from '../repositories/stock-intelligence.repository';
import { aggregateSales, calculateMetric, classifyAbc } from './stock-intelligence-calculator';

const WINDOW_DAYS = 90;
const DAY_MS = 24 * 60 * 60 * 1000;

/** Contexto sintético para chamadas de sistema (job periódico), que não têm
 *  um usuário logado por trás. `ProductService.search` só usa `tenantId`
 *  do contexto — os demais campos existem para satisfazer o tipo. */
const systemContext = (tenantId: string): TenantContext => ({
  tenantId,
  userId: 'system',
  roleIds: [],
  branchIds: [],
  warehouseIds: [],
});

@Injectable()
export class StockIntelligenceService {
  private readonly logger = new Logger(StockIntelligenceService.name);

  constructor(
    private readonly repository: StockIntelligenceRepository,
    private readonly products: ProductService,
    private readonly partners: PartnerService,
  ) {}

  /** Etapa "estoque" do onboarding (§65): existe algum saldo lançado pra
   *  este tenant? Não importa qual filial/produto, só que o módulo de
   *  estoque já foi usado de verdade, não só cadastrado. */
  async hasAnyStock(tenantId: string): Promise<boolean> {
    const balances = await this.repository.listAllBalances(tenantId);
    return balances.length > 0;
  }

  /** Recalcula os indicadores de uma filial e persiste uma linha por
   *  produto. É a mesma lógica chamada pelo job periódico e pelo endpoint
   *  de recálculo manual — não há dois caminhos para o mesmo cálculo. */
  async recalculate(tenantId: string, branchId: string, now = new Date()): Promise<number> {
    const since = new Date(now.getTime() - WINDOW_DAYS * DAY_MS).toISOString();

    const [balances, movements, suppliers, products] = await Promise.all([
      this.repository.listBalances(tenantId, branchId),
      this.repository.listSalesMovements(tenantId, branchId, since),
      Promise.resolve(this.partners.searchSuppliers(tenantId, '')),
      this.listAllProducts(tenantId),
    ]);
    if (products.length === 0) return 0;

    const salesByProduct = aggregateSales(movements);
    const balanceByProduct = new Map(balances.map((balance) => [balance.productId, balance]));
    const supplierById = new Map(suppliers.map((supplier) => [supplier.id, supplier]));

    const revenueByProduct = new Map<string, number>();
    const quantityByProduct = new Map<string, number>();
    const marginByProduct = new Map<string, number>();
    for (const product of products) {
      const quantitySold = salesByProduct.get(product.id)?.quantitySold ?? 0;
      revenueByProduct.set(product.id, quantitySold * product.pricing.salePrice);
      quantityByProduct.set(product.id, quantitySold);
      marginByProduct.set(
        product.id,
        quantitySold * (product.pricing.salePrice - product.pricing.averageCost),
      );
    }
    const abcByRevenue = classifyAbc(revenueByProduct);
    const abcByQuantity = classifyAbc(quantityByProduct);
    const abcByMargin = classifyAbc(marginByProduct);

    const metrics: StockIntelligenceMetric[] = products.map((product) =>
      calculateMetric({
        tenantId,
        branchId,
        windowDays: WINDOW_DAYS,
        product,
        balance: balanceByProduct.get(product.id) ?? null,
        sales: salesByProduct.get(product.id),
        supplier: product.supplierId
          ? (supplierById.get(product.supplierId as Supplier['id']) ?? null)
          : null,
        abc: {
          byRevenue: abcByRevenue.get(product.id) ?? 'C',
          byQuantity: abcByQuantity.get(product.id) ?? 'C',
          byMargin: abcByMargin.get(product.id) ?? 'C',
        },
        now,
      }),
    );

    await this.repository.saveMetrics(tenantId, metrics);
    this.logger.log(
      `Recalculado: tenant=${tenantId} filial=${branchId} produtos=${metrics.length}`,
    );
    return metrics.length;
  }

  /** Chamado pelo job (§39 "job periódico"): descobre as filiais com
   *  estoque de cada tenant a partir dos próprios saldos — não existe um
   *  cadastro central de tenants/filiais fora do Firestore para percorrer. */
  async recalculateAllTenants(now = new Date()): Promise<void> {
    const tenantIds = await this.repository.listTenantIds();
    for (const tenantId of tenantIds) {
      const balances = await this.repository.listAllBalances(tenantId);
      const branchIds = new Set(balances.map((balance) => balance.branchId));
      for (const branchId of branchIds) {
        try {
          await this.recalculate(tenantId, branchId, now);
        } catch (error) {
          this.logger.error(
            `Falha ao recalcular tenant=${tenantId} filial=${branchId}: ${(error as Error).message}`,
          );
        }
      }
    }
  }

  async list(
    tenantId: string,
    query: ListStockIntelligenceQuery,
  ): Promise<StockIntelligenceMetric[]> {
    const items = await this.repository.list(tenantId, query.branchId);
    return items
      .filter((item) => !query.abcClass || item.abc.byRevenue === query.abcClass)
      .filter((item) => !query.onlyDeadStock || item.isDeadStock)
      .filter((item) => !query.onlyExcess || item.isExcess)
      .filter((item) => !query.onlySuggested || item.suggestedPurchaseQty > 0);
  }

  /** Ajuste manual da sugestão antes de virar pedido de compra (§39) — a
   *  criação do pedido em si é do módulo de Compras e recebimento. */
  async adjust(
    tenantId: string,
    productId: string,
    userId: string,
    input: AdjustSuggestionInput,
  ): Promise<StockIntelligenceMetric> {
    const id = `${input.branchId}_${productId}`;
    const existing = await this.repository.findOne(tenantId, id);
    if (!existing) throw new NotFoundException('Indicador ainda não calculado para este produto');

    const patch = {
      approvedPurchaseQty: input.approvedPurchaseQty,
      adjustedBy: userId,
      adjustedAt: new Date().toISOString(),
      adjustmentNote: input.note ?? null,
    };
    await this.repository.saveAdjustment(tenantId, id, patch);
    return { ...existing, ...patch };
  }

  private async listAllProducts(tenantId: string): Promise<Product[]> {
    const context = systemContext(tenantId);
    const products: Product[] = [];
    let cursor: string | undefined;
    for (;;) {
      const page: Page<Product> = this.products.search(context, {}, MAX_PAGE_LIMIT, cursor);
      products.push(...page.items);
      if (!page.hasMore || !page.nextCursor) break;
      cursor = page.nextCursor;
    }
    return products;
  }
}
