import { PRODUCT_STATUS_ALLOWS_SALE, type ProductStatus } from '@synapse/types';
import type { CreateProductInput } from '@synapse/validation';
import type { TenantContext } from '../../iam/iam.types';
import { ProductRepository } from '../repositories/product.repository';
import { computeMarginPercent, ProductService } from './product.service';

const tenant: TenantContext = {
  tenantId: 'tenant-1',
  userId: 'user-1',
  roleIds: ['ADMIN_EMPRESA'],
  branchIds: [],
  warehouseIds: [],
};

const baseInput = (sku: string): CreateProductInput => ({
  sku,
  internalCode: null,
  ean: null,
  name: `Racao Premium ${sku}`,
  shortDescription: null,
  brand: null,
  manufacturer: null,
  supplierId: null,
  categoryId: null,
  subcategoryId: null,
  status: 'active',
  logistics: {
    unit: 'KG',
    weightKg: 20,
    packaging: null,
    quantityPerPackage: 1,
    minStock: 0,
    maxStock: 100,
    tracksLot: false,
    tracksExpiration: false,
  },
  pricing: {
    cost: 100,
    averageCost: 100,
    lastCost: 100,
    salePrice: 189.9,
    promotionalPrice: null,
    marginPercent: computeMarginPercent(100, 189.9),
  },
  fiscal: {
    ncm: '23099090',
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
});

describe('computeMarginPercent', () => {
  it('calcula a margem sobre o preco de venda', () => {
    expect(computeMarginPercent(100, 200)).toBe(50);
    expect(computeMarginPercent(0, 100)).toBe(100);
  });

  it('nao divide por zero quando o preco de venda e zero', () => {
    expect(computeMarginPercent(10, 0)).toBe(0);
  });
});

describe('ProductService — cadastro', () => {
  it('cria um produto com todos os campos da secao 5', () => {
    const service = new ProductService(new ProductRepository());
    const product = service.create(tenant, baseInput('RC-20KG'));
    expect(product.fiscal.ncm).toBe('23099090');
    expect(product.pricing.salePrice).toBe(189.9);
    expect(product.status).toBe('active');
  });

  it('recusa SKU duplicado no mesmo tenant', () => {
    const service = new ProductService(new ProductRepository());
    service.create(tenant, baseInput('RC-20KG'));
    expect(() => service.create(tenant, baseInput('RC-20KG'))).toThrow();
  });

  it('permite o mesmo SKU em tenants diferentes', () => {
    const service = new ProductService(new ProductRepository());
    service.create(tenant, baseInput('RC-20KG'));
    expect(() =>
      service.create({ ...tenant, tenantId: 'tenant-2' }, baseInput('RC-20KG')),
    ).not.toThrow();
  });
});

describe('ProductService — efeito do status na venda (c8-4)', () => {
  const service = new ProductService(new ProductRepository());
  const cases: Array<[ProductStatus, boolean]> = [
    ['active', true],
    ['inactive', false],
    ['blocked', false],
    ['discontinued', false],
  ];

  it.each(cases)('status %s permite venda: %s', (status, allowed) => {
    expect(PRODUCT_STATUS_ALLOWS_SALE[status]).toBe(allowed);
    const product = service.create(tenant, { ...baseInput(`SKU-${status}`), status });
    if (allowed) {
      expect(() => service.assertCanSell(tenant, product.id)).not.toThrow();
    } else {
      expect(() => service.assertCanSell(tenant, product.id)).toThrow();
    }
  });
});

describe('ProductService — busca e paginacao por cursor', () => {
  it('pagina os resultados e devolve hasMore ate acabar', () => {
    const service = new ProductService(new ProductRepository());
    for (let i = 0; i < 5; i += 1) service.create(tenant, baseInput(`SKU-${i}`));

    const page1 = service.search(tenant, {}, 2);
    expect(page1.items).toHaveLength(2);
    expect(page1.hasMore).toBe(true);

    const page2 = service.search(tenant, {}, 2, page1.nextCursor ?? undefined);
    expect(page2.items).toHaveLength(2);
    expect(page2.items[0]?.sku).not.toBe(page1.items[0]?.sku);

    const page3 = service.search(tenant, {}, 2, page2.nextCursor ?? undefined);
    expect(page3.items).toHaveLength(1);
    expect(page3.hasMore).toBe(false);
  });

  it('busca por SKU, codigo de barras e descricao (c8-6)', () => {
    const service = new ProductService(new ProductRepository());
    service.create(tenant, { ...baseInput('RC-20KG'), ean: '4006381333931' });
    const bySku = service.search(tenant, { q: 'RC-20KG' }, 10);
    const byEan = service.search(tenant, { q: '4006381333931' }, 10);
    const byName = service.search(tenant, { q: 'racao premium' }, 10);
    expect(bySku.items).toHaveLength(1);
    expect(byEan.items).toHaveLength(1);
    expect(byName.items).toHaveLength(1);
  });
});

describe('ProductService — importacao em massa (c8-5)', () => {
  it('importa linhas validas e reporta as invalidas sem parar a planilha', () => {
    const service = new ProductService(new ProductRepository());
    const csv = [
      'sku,name,unit,ncm,defaultCfop,origin,cost,salePrice',
      'RC-10KG,Racao 10kg,KG,23099090,5102,0,50,89.9',
      'RC-INVALIDO,Racao invalida,KG,123,5102,0,50,89.9',
      'RC-15KG,Racao 15kg,KG,23099090,5102,0,70,129.9',
    ].join('\n');

    const result = service.importCsv(tenant, csv);
    expect(result.imported).toBe(2);
    expect(result.failed).toBe(1);
    expect(result.rows[1]?.ok).toBe(false);
    expect(service.search(tenant, {}, 10).items).toHaveLength(2);
  });
});
