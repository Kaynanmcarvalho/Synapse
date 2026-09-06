import { NotFoundException } from '@nestjs/common';
import type {
  Product,
  StockBalance,
  StockIntelligenceMetric,
  StockMovement,
  Supplier,
} from '@synapse/types';
import { PartnerRepository } from '../../catalog/repositories/partner.repository';
import { ProductRepository } from '../../catalog/repositories/product.repository';
import { PartnerService } from '../../catalog/services/partner.service';
import { ProductService } from '../../catalog/services/product.service';
import type { TenantContext } from '../../iam/iam.types';
import type { StockIntelligenceRepository } from '../repositories/stock-intelligence.repository';
import { StockIntelligenceService } from './stock-intelligence.service';

const tenant: TenantContext = {
  tenantId: 'tenant-1',
  userId: 'user-1',
  roleIds: [],
  branchIds: [],
  warehouseIds: [],
};

class FakeStockIntelligenceRepository {
  saved: StockIntelligenceMetric[] = [];
  balances: StockBalance[] = [];
  movements: StockMovement[] = [];
  tenantIds: string[] = [];
  stored = new Map<string, StockIntelligenceMetric>();

  async listTenantIds() {
    return this.tenantIds;
  }
  async listAllBalances(_tenantId: string) {
    return this.balances;
  }
  async listBalances(_tenantId: string, branchId: string) {
    return this.balances.filter((balance) => balance.branchId === branchId);
  }
  async listSalesMovements(_tenantId: string, branchId: string, _sinceIso: string) {
    return this.movements.filter((movement) => movement.branchId === branchId);
  }
  async saveMetrics(_tenantId: string, metrics: readonly StockIntelligenceMetric[]) {
    this.saved = [...metrics];
    for (const metric of metrics) this.stored.set(metric.id, metric);
  }
  async list(_tenantId: string, branchId: string) {
    return [...this.stored.values()].filter((metric) => metric.branchId === branchId);
  }
  async findOne(_tenantId: string, id: string) {
    return this.stored.get(id) ?? null;
  }
  async saveAdjustment(
    _tenantId: string,
    id: string,
    patch: Pick<
      StockIntelligenceMetric,
      'approvedPurchaseQty' | 'adjustedBy' | 'adjustedAt' | 'adjustmentNote'
    >,
  ) {
    const existing = this.stored.get(id);
    if (existing) this.stored.set(id, { ...existing, ...patch });
  }
}

const productInput = (sku: string, salePrice: number, cost: number): Product =>
  ({
    id: `product-${sku}`,
    tenantId: tenant.tenantId,
    sku,
    internalCode: null,
    ean: null,
    name: `Produto ${sku}`,
    shortDescription: null,
    brand: null,
    manufacturer: null,
    supplierId: null,
    categoryId: null,
    subcategoryId: null,
    photoUrl: null,
    status: 'active',
    logistics: {
      unit: 'UN',
      weightKg: null,
      packaging: null,
      quantityPerPackage: 1,
      minStock: 5,
      maxStock: 0,
      tracksLot: false,
      tracksExpiration: false,
    },
    pricing: {
      cost,
      averageCost: cost,
      lastCost: cost,
      salePrice,
      promotionalPrice: null,
      marginPercent: 0,
    },
    fiscal: {
      ncm: '0000',
      cest: null,
      defaultCfop: '5102',
      cst: null,
      csosn: null,
      origin: 0,
      pisCode: null,
      cofinsCode: null,
      ipiCode: null,
      icmsCode: null,
    },
    createdAt: '2026-01-01T00:00:00.000Z',
    createdBy: { uid: 'seed', email: '', name: '', source: 'api' },
    updatedAt: '2026-01-01T00:00:00.000Z',
    updatedBy: { uid: 'seed', email: '', name: '', source: 'api' },
    version: 1,
  }) as Product;

const movementOf = (productId: string, branchId: string, quantity: number): StockMovement =>
  ({
    id: `${productId}-mov`,
    tenantId: tenant.tenantId,
    branchId,
    warehouseId: 'wh',
    productId,
    kind: 'SALE',
    quantity,
    before: {} as StockBalance,
    after: { available: 3 } as StockBalance,
    sourceId: 'order',
    destinationId: null,
    document: null,
    reason: 'venda',
    userId: 'user',
    occurredAt: '2026-03-01T00:00:00.000Z',
    idempotencyKey: `${productId}-mov`,
  }) as StockMovement;

function buildService(repository: FakeStockIntelligenceRepository) {
  const productRepository = new ProductRepository();
  const partnerRepository = new PartnerRepository();
  const products = new ProductService(productRepository);
  const partners = new PartnerService(partnerRepository);
  const service = new StockIntelligenceService(
    repository as unknown as StockIntelligenceRepository,
    products,
    partners,
  );
  return { service, productRepository, partnerRepository };
}

describe('StockIntelligenceService.recalculate', () => {
  it('classifica ABC entre os produtos e persiste uma métrica por produto', async () => {
    const repository = new FakeStockIntelligenceRepository();
    const { service, productRepository } = buildService(repository);

    productRepository.save({ ...productInput('A', 100, 50), tenantId: tenant.tenantId } as Product);
    productRepository.save({ ...productInput('B', 100, 50), tenantId: tenant.tenantId } as Product);

    repository.balances = [
      { branchId: 'matriz', productId: 'product-A', available: 10 } as unknown as StockBalance,
      { branchId: 'matriz', productId: 'product-B', available: 10 } as unknown as StockBalance,
    ];
    repository.movements = [
      movementOf('product-A', 'matriz', 90), // domina o faturamento -> A
      movementOf('product-B', 'matriz', 10),
    ];

    const count = await service.recalculate(tenant.tenantId, 'matriz', new Date('2026-04-01'));

    expect(count).toBe(2);
    expect(repository.saved).toHaveLength(2);
    const metricA = repository.saved.find((metric) => metric.productId === 'product-A');
    const metricB = repository.saved.find((metric) => metric.productId === 'product-B');
    // A domina 90% do faturamento (fica sozinho abaixo de 80% acumulado);
    // B entra depois, com o acumulado já em 90% — cai na faixa B (80-95%).
    expect(metricA?.abc.byRevenue).toBe('A');
    expect(metricB?.abc.byRevenue).toBe('B');
    expect(metricA?.quantitySold).toBe(90);
  });

  it('não grava nada quando o tenant não tem nenhum produto cadastrado', async () => {
    const repository = new FakeStockIntelligenceRepository();
    const { service } = buildService(repository);
    const count = await service.recalculate(tenant.tenantId, 'matriz');
    expect(count).toBe(0);
    expect(repository.saved).toHaveLength(0);
  });

  it('usa o averageLeadDays do fornecedor do produto quando ele existe', async () => {
    const repository = new FakeStockIntelligenceRepository();
    const { service, productRepository, partnerRepository } = buildService(repository);

    const supplier = {
      id: 'supplier-1',
      tenantId: tenant.tenantId,
      taxId: '00000000000000',
      legalName: 'Fornecedor Rápido Ltda',
      tradeName: 'Fornecedor Rápido',
      contacts: [],
      averageLeadDays: 12,
    } as unknown as Supplier;
    partnerRepository.saveSupplier(supplier);
    productRepository.save({
      ...productInput('C', 50, 20),
      tenantId: tenant.tenantId,
      supplierId: supplier.id,
    } as unknown as Product);

    await service.recalculate(tenant.tenantId, 'matriz', new Date('2026-04-01'));
    const metric = repository.saved[0];
    expect(metric?.leadTimeDays).toBe(12);
    expect(metric?.supplierName).toBe('Fornecedor Rápido');
  });
});

describe('StockIntelligenceService.recalculateAllTenants', () => {
  it('descobre as filiais pelos saldos e segue para a próxima mesmo se uma falhar', async () => {
    const repository = new FakeStockIntelligenceRepository();
    const { service, productRepository } = buildService(repository);
    productRepository.save({ ...productInput('D', 10, 5), tenantId: tenant.tenantId } as Product);

    repository.tenantIds = [tenant.tenantId];
    repository.balances = [
      { branchId: 'matriz', productId: 'product-D', available: 1 } as unknown as StockBalance,
      { branchId: 'filial-2', productId: 'product-D', available: 1 } as unknown as StockBalance,
    ];

    const recalculateSpy = jest
      .spyOn(service, 'recalculate')
      .mockImplementationOnce(() => Promise.reject(new Error('falha simulada')))
      .mockImplementationOnce(() => Promise.resolve(1));

    await expect(service.recalculateAllTenants()).resolves.toBeUndefined();
    expect(recalculateSpy).toHaveBeenCalledTimes(2);
  });
});

describe('StockIntelligenceService.list', () => {
  it('filtra por classe ABC, estoque parado, excesso e sugestão', async () => {
    const repository = new FakeStockIntelligenceRepository();
    const { service } = buildService(repository);

    const base = {
      tenantId: tenant.tenantId,
      branchId: 'matriz',
      windowDays: 90,
      revenue: 0,
      quantitySold: 0,
      margin: 0,
      stockOnHand: 0,
      avgDailySales: 0,
      turnoverRate: 0,
      coverageDays: null,
      stockoutCount: 0,
      lastStockoutAt: null,
      supplierId: null,
      supplierName: null,
      leadTimeDays: 7,
      safetyStock: 0,
      approvedPurchaseQty: null,
      adjustedBy: null,
      adjustedAt: null,
      adjustmentNote: null,
      calculatedAt: '2026-04-01T00:00:00.000Z',
    } as const;

    repository.stored.set('matriz_p1', {
      ...base,
      id: 'matriz_p1',
      productId: 'p1',
      productName: 'Dead stock A',
      sku: 'P1',
      abc: { byRevenue: 'A', byQuantity: 'A', byMargin: 'A' },
      isDeadStock: true,
      isExcess: false,
      suggestedPurchaseQty: 0,
    } as unknown as StockIntelligenceMetric);
    repository.stored.set('matriz_p2', {
      ...base,
      id: 'matriz_p2',
      productId: 'p2',
      productName: 'Precisa comprar C',
      sku: 'P2',
      abc: { byRevenue: 'C', byQuantity: 'C', byMargin: 'C' },
      isDeadStock: false,
      isExcess: false,
      suggestedPurchaseQty: 20,
    } as unknown as StockIntelligenceMetric);

    const onlyA = await service.list(tenant.tenantId, { branchId: 'matriz', abcClass: 'A' } as any);
    expect(onlyA.map((item) => item.productId)).toEqual(['p1']);

    const deadStock = await service.list(tenant.tenantId, {
      branchId: 'matriz',
      onlyDeadStock: true,
    } as any);
    expect(deadStock.map((item) => item.productId)).toEqual(['p1']);

    const suggested = await service.list(tenant.tenantId, {
      branchId: 'matriz',
      onlySuggested: true,
    } as any);
    expect(suggested.map((item) => item.productId)).toEqual(['p2']);
  });
});

describe('StockIntelligenceService.adjust', () => {
  it('lança NotFoundException quando o indicador ainda não foi calculado', async () => {
    const repository = new FakeStockIntelligenceRepository();
    const { service } = buildService(repository);
    await expect(
      service.adjust(tenant.tenantId, 'produto-inexistente', 'user-1', {
        branchId: 'matriz',
        approvedPurchaseQty: 5,
      }),
    ).rejects.toBeInstanceOf(NotFoundException);
  });

  it('grava o ajuste manual e devolve a métrica atualizada', async () => {
    const repository = new FakeStockIntelligenceRepository();
    const { service } = buildService(repository);
    repository.stored.set('matriz_p1', {
      id: 'matriz_p1',
      productId: 'p1',
      branchId: 'matriz',
      suggestedPurchaseQty: 8,
      approvedPurchaseQty: null,
    } as unknown as StockIntelligenceMetric);

    const result = await service.adjust(tenant.tenantId, 'p1', 'user-1', {
      branchId: 'matriz',
      approvedPurchaseQty: 15,
      note: 'ajustado para cobrir a promoção',
    });

    expect(result.approvedPurchaseQty).toBe(15);
    expect(result.adjustedBy).toBe('user-1');
    expect(repository.stored.get('matriz_p1')?.approvedPurchaseQty).toBe(15);
  });
});
