import { BadRequestException } from '@nestjs/common';
import type {
  Product,
  PurchaseOrder,
  Receiving,
  StockBalance,
  Supplier,
  Titulo,
} from '@synapse/types';
import { PartnerRepository } from '../../catalog/repositories/partner.repository';
import { ProductRepository } from '../../catalog/repositories/product.repository';
import { PartnerService } from '../../catalog/services/partner.service';
import { ProductService } from '../../catalog/services/product.service';
import { TituloRepository } from '../../finance/repositories/titulo.repository';
import { TituloService } from '../../finance/services/titulo.service';
import type { TenantContext } from '../../iam/iam.types';
import type { InventoryService } from '../../inventory/services/inventory.service';
import { criarRascunho } from '../entities/pedido-de-compra';
import type { PurchaseOrderRepository } from '../repositories/purchase-order.repository';
import type { ReceivingRepository } from '../repositories/receiving.repository';
import { NfeXmlParserService } from './nfe-xml-parser.service';
import { ReceivingService } from './receiving.service';

const tenant: TenantContext = {
  tenantId: 'tenant-1',
  userId: 'user-1',
  roleIds: [],
  branchIds: [],
  warehouseIds: [],
};

class FakePurchaseOrderRepository {
  orders = new Map<string, PurchaseOrder>();
  async create(_tenantId: string, order: PurchaseOrder) {
    this.orders.set(order.id, order);
    return order;
  }
  async findById(_tenantId: string, id: string) {
    return this.orders.get(id) ?? null;
  }
  async update(_tenantId: string, order: PurchaseOrder, expectedVersion: number) {
    const current = this.orders.get(order.id);
    if (!current || current.version !== expectedVersion) throw new Error('CONFLICT');
    this.orders.set(order.id, order);
    return order;
  }
}

class FakeReceivingRepository {
  created: Receiving[] = [];
  balances = new Map<string, StockBalance>();
  async create(_tenantId: string, receiving: Receiving) {
    this.created.push(receiving);
    return receiving;
  }
  async getBalance(_tenantId: string, branchId: string, warehouseId: string, productId: string) {
    return this.balances.get(`${branchId}_${warehouseId}_${productId}`) ?? null;
  }
}

class FakeInventoryService {
  moves: Array<{ productId: string; quantity: number }> = [];
  async move(_context: TenantContext, input: { productId: string; quantity: number }) {
    this.moves.push({ productId: input.productId, quantity: input.quantity });
    return {} as StockBalance;
  }
}

const productFixture = (id: string, salePrice: number, averageCost: number): Product =>
  ({
    id,
    tenantId: tenant.tenantId,
    sku: id.toUpperCase(),
    internalCode: null,
    ean: null,
    name: `Produto ${id}`,
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
      minStock: 0,
      maxStock: 0,
      tracksLot: false,
      tracksExpiration: false,
    },
    pricing: {
      cost: averageCost,
      averageCost,
      lastCost: averageCost,
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

function buildService() {
  const purchaseOrders = new FakePurchaseOrderRepository();
  const receivings = new FakeReceivingRepository();
  const inventory = new FakeInventoryService();
  const productRepository = new ProductRepository();
  const products = new ProductService(productRepository);
  const partnerRepository = new PartnerRepository();
  const partners = new PartnerService(partnerRepository);
  const tituloRepository = {
    create: jest.fn((_t: string, titulo: Titulo) => Promise.resolve(titulo)),
  };
  const titulos = new TituloService(tituloRepository as unknown as TituloRepository);
  const xmlParser = new NfeXmlParserService();

  const service = new ReceivingService(
    purchaseOrders as unknown as PurchaseOrderRepository,
    receivings as unknown as ReceivingRepository,
    inventory as unknown as InventoryService,
    products,
    partners,
    titulos,
    xmlParser,
  );

  return {
    service,
    purchaseOrders,
    receivings,
    inventory,
    productRepository,
    partnerRepository,
    tituloRepository,
  };
}

const supplierFixture = (id: string): Supplier =>
  ({
    id,
    tenantId: tenant.tenantId,
    taxId: '12345678000199',
    stateRegistration: 'ISENTO',
    legalName: 'Fornecedor XYZ Ltda',
    tradeName: 'Fornecedor XYZ',
    contacts: [],
    paymentTermId: null,
    averageLeadDays: 5,
    averagePrice: 0,
    productIds: [],
    active: true,
  }) as unknown as Supplier;

describe('ReceivingService.receiveManual', () => {
  it('aplica o movimento de estoque, atualiza o custo médio e gera o título a pagar', async () => {
    const { service, purchaseOrders, receivings, inventory, productRepository, partnerRepository } =
      buildService();

    productRepository.save(productFixture('produto-a', 100, 10)); // custo em centavos: 10
    partnerRepository.saveSupplier(supplierFixture('fornecedor-1'));
    receivings.balances.set('matriz_wh1_produto-a', {
      productId: 'produto-a',
      branchId: 'matriz',
      warehouseId: 'wh1',
      available: 20,
    } as unknown as StockBalance);

    let order = criarRascunho({
      tenantId: tenant.tenantId as never,
      branchId: 'matriz' as never,
      warehouseId: 'wh1',
      items: [{ productId: 'produto-a' as never, quantityOrdered: 10 }],
      sourceSuggestionIds: [],
      createdBy: tenant.userId as never,
      now: '2026-04-01T00:00:00.000Z',
    });
    const firstItem = order.items.find(() => true);
    if (!firstItem) throw new Error('fixture sem itens');
    order = {
      ...order,
      status: 'APROVADO',
      supplierId: 'fornecedor-1' as never,
      items: [{ ...firstItem, unitCostCentavos: 1500 }],
    };
    await purchaseOrders.create(tenant.tenantId, order);

    const receiving = await service.receiveManual(tenant, order.id, {
      warehouseId: 'wh1',
      lines: [{ productId: 'produto-a', quantityReceived: 10, unitCostReceived: 1500 }],
    });

    expect(inventory.moves).toEqual([{ productId: 'produto-a', quantity: 10 }]);
    expect(receiving.totalCostCentavos).toBe(15_000); // 10 * 1500
    expect(receiving.tituloId).toBeTruthy();

    const updatedProduct = productRepository.findById(tenant.tenantId, 'produto-a');
    // (20*10 + 10*1500) / 30 = 506.67 -> arredonda pra 507
    expect(updatedProduct?.pricing.averageCost).toBe(507);

    const updatedOrder = await purchaseOrders.findById(tenant.tenantId, order.id);
    expect(updatedOrder?.status).toBe('RECEBIDO');
    expect(receivings.created).toHaveLength(1);
  });

  it('recusa receber um pedido sem fornecedor aprovado', async () => {
    const { service, purchaseOrders } = buildService();
    let order = criarRascunho({
      tenantId: tenant.tenantId as never,
      branchId: 'matriz' as never,
      warehouseId: 'wh1',
      items: [{ productId: 'produto-a' as never, quantityOrdered: 10 }],
      sourceSuggestionIds: [],
      createdBy: tenant.userId as never,
      now: '2026-04-01T00:00:00.000Z',
    });
    order = { ...order, status: 'APROVADO' }; // sem supplierId
    await purchaseOrders.create(tenant.tenantId, order);

    await expect(
      service.receiveManual(tenant, order.id, {
        warehouseId: 'wh1',
        lines: [{ productId: 'produto-a', quantityReceived: 10, unitCostReceived: 1000 }],
      }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('recusa quando nenhuma linha tem quantidade recebida', async () => {
    const { service, purchaseOrders } = buildService();
    let order = criarRascunho({
      tenantId: tenant.tenantId as never,
      branchId: 'matriz' as never,
      warehouseId: 'wh1',
      items: [{ productId: 'produto-a' as never, quantityOrdered: 10 }],
      sourceSuggestionIds: [],
      createdBy: tenant.userId as never,
      now: '2026-04-01T00:00:00.000Z',
    });
    order = { ...order, status: 'APROVADO', supplierId: 'fornecedor-1' as never };
    await purchaseOrders.create(tenant.tenantId, order);

    await expect(
      service.receiveManual(tenant, order.id, {
        warehouseId: 'wh1',
        lines: [{ productId: 'produto-a', quantityReceived: 0, unitCostReceived: 1000 }],
      }),
    ).rejects.toBeInstanceOf(Error);
  });
});

describe('ReceivingService.receiveFromXml', () => {
  it('rejeita quando o CNPJ do emitente não bate com o fornecedor do pedido', async () => {
    const { service, purchaseOrders, partnerRepository } = buildService();
    partnerRepository.saveSupplier({ ...supplierFixture('fornecedor-1'), taxId: '99999999000199' });

    let order = criarRascunho({
      tenantId: tenant.tenantId as never,
      branchId: 'matriz' as never,
      warehouseId: 'wh1',
      items: [{ productId: 'SKU001' as never, quantityOrdered: 10 }],
      sourceSuggestionIds: [],
      createdBy: tenant.userId as never,
      now: '2026-04-01T00:00:00.000Z',
    });
    order = { ...order, status: 'APROVADO', supplierId: 'fornecedor-1' as never };
    await purchaseOrders.create(tenant.tenantId, order);

    const xml = `<NFe xmlns="http://www.portalfiscal.inf.br/nfe">
      <infNFe Id="NFe35260312345678000199550010000012345123456789" versao="4.00">
        <ide><dhEmi>2026-03-15T10:00:00-03:00</dhEmi></ide>
        <emit><CNPJ>12345678000199</CNPJ></emit>
        <det nItem="1"><prod><cProd>SKU001</cProd><xProd>Produto</xProd><qCom>10</qCom><vUnCom>15.00</vUnCom></prod></det>
      </infNFe>
    </NFe>`;

    await expect(
      service.receiveFromXml(tenant, order.id, { warehouseId: 'wh1', xml }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('rejeita item da NF-e que não está no pedido', async () => {
    const { service, purchaseOrders, partnerRepository } = buildService();
    partnerRepository.saveSupplier(supplierFixture('fornecedor-1'));

    let order = criarRascunho({
      tenantId: tenant.tenantId as never,
      branchId: 'matriz' as never,
      warehouseId: 'wh1',
      items: [{ productId: 'OUTRO-SKU' as never, quantityOrdered: 10 }],
      sourceSuggestionIds: [],
      createdBy: tenant.userId as never,
      now: '2026-04-01T00:00:00.000Z',
    });
    order = { ...order, status: 'APROVADO', supplierId: 'fornecedor-1' as never };
    await purchaseOrders.create(tenant.tenantId, order);

    const xml = `<NFe xmlns="http://www.portalfiscal.inf.br/nfe">
      <infNFe Id="NFe35260312345678000199550010000012345123456789" versao="4.00">
        <ide><dhEmi>2026-03-15T10:00:00-03:00</dhEmi></ide>
        <emit><CNPJ>12345678000199</CNPJ></emit>
        <det nItem="1"><prod><cProd>SKU001</cProd><xProd>Produto</xProd><qCom>10</qCom><vUnCom>15.00</vUnCom></prod></det>
      </infNFe>
    </NFe>`;

    await expect(
      service.receiveFromXml(tenant, order.id, { warehouseId: 'wh1', xml }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });
});
