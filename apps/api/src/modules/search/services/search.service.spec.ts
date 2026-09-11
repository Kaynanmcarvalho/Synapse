import type { Product, Supplier } from '@synapse/types';
import { PartnerRepository } from '../../catalog/repositories/partner.repository';
import { ProductRepository } from '../../catalog/repositories/product.repository';
import { OrderRepository } from '../../sales/repositories/order.repository';
import { FiscalRepository } from '../../fiscal/repositories/fiscal.repository';
import type { TituloRepository } from '../../finance/repositories/titulo.repository';
import type { SellerRepository } from '../../field-sales/repositories/seller.repository';
import { RoleService } from '../../iam/services/role.service';
import { RoleRepository } from '../../iam/repositories/role.repository';
import type { TenantContext } from '../../iam/iam.types';
import { SearchService } from './search.service';

const tenant: TenantContext = {
  tenantId: 'tenant-1',
  userId: 'user-1',
  roleIds: ['ADMIN_EMPRESA'],
  branchIds: [],
  warehouseIds: [],
};

function buildService() {
  const productRepository = new ProductRepository();
  const partnerRepository = new PartnerRepository();
  const orders = new OrderRepository();
  const fiscal = new FiscalRepository();
  const titulos = { search: jest.fn(async () => []) };
  const sellers = { search: jest.fn(async () => []) };
  const service = new SearchService(
    productRepository,
    partnerRepository,
    orders,
    fiscal,
    titulos as unknown as TituloRepository,
    sellers as unknown as SellerRepository,
    new RoleService(new RoleRepository()),
  );
  return { service, productRepository, partnerRepository, orders, fiscal, titulos, sellers };
}

const productFixture = (id: string, name: string, sku: string): Product =>
  ({
    id,
    tenantId: tenant.tenantId,
    sku,
    internalCode: null,
    ean: null,
    name,
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
      cost: 10,
      averageCost: 10,
      lastCost: 10,
      salePrice: 25.9,
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

describe('SearchService.search', () => {
  it('acha um produto pelo nome e devolve título/subtítulo formatados', async () => {
    const { service, productRepository } = buildService();
    productRepository.save(productFixture('p1', 'Semente de Milho AG 8700', 'SEM-8700'));

    const result = await service.search(tenant, 'milho', 20);
    expect(result.items).toHaveLength(1);
    expect(result.items[0]).toMatchObject({
      type: 'product',
      id: 'p1',
      title: 'Semente de Milho AG 8700',
    });
    expect(result.items[0]?.subtitle).toContain('SEM-8700');
  });

  it('busca ao mesmo tempo em produtos, clientes e fornecedores', async () => {
    const { service, productRepository, partnerRepository } = buildService();
    productRepository.save(productFixture('p1', 'Fertilizante Sol', 'FER-1'));
    partnerRepository.saveCustomer({
      id: 'c1',
      tenantId: tenant.tenantId,
      name: 'Fazenda Sol Nascente',
      taxId: '000',
      phone: '000',
    } as never);
    partnerRepository.saveSupplier({
      id: 's1',
      tenantId: tenant.tenantId,
      tradeName: 'Solar Insumos',
      legalName: 'Solar Insumos Agropecuaria Ltda',
      taxId: '111',
      contacts: [],
    } as unknown as Supplier);

    const result = await service.search(tenant, 'sol', 20);
    const types = result.items.map((item) => item.type).sort();
    expect(types).toEqual(['customer', 'product', 'supplier']);
  });

  it('não marca nenhuma entidade como indisponível (vendedor já está integrado)', async () => {
    const { service } = buildService();
    const result = await service.search(tenant, 'qualquer', 20);
    expect(result.unavailable).toEqual([]);
  });

  it('não quebra quando nada bate com a query', async () => {
    const { service, productRepository } = buildService();
    productRepository.save(productFixture('p1', 'Produto Único', 'SKU-1'));
    const result = await service.search(tenant, 'inexistente-xyz', 20);
    expect(result.items).toEqual([]);
  });
});
