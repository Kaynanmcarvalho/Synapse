import type { CreateProductInput } from '@synapse/validation';
import type { TenantContext } from '../../iam/iam.types';
import { PricingRepository } from '../repositories/pricing.repository';
import { ProductRepository } from '../repositories/product.repository';
import { computeMarginPercent, ProductService } from './product.service';
import { PricingService } from './pricing.service';

const tenant: TenantContext = {
  tenantId: 'tenant-1',
  userId: 'vendedor-1',
  roleIds: ['VENDEDOR'],
  branchIds: [],
  warehouseIds: [],
};

const racaoPremium = (salePrice: number): CreateProductInput => ({
  sku: 'RC-PREMIUM-20KG',
  internalCode: null,
  ean: null,
  name: 'Racao Premium 20kg',
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
    cost: 120,
    averageCost: 120,
    lastCost: 120,
    salePrice,
    promotionalPrice: null,
    marginPercent: computeMarginPercent(120, salePrice),
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

const setup = () => {
  const productRepository = new ProductRepository();
  const products = new ProductService(productRepository);
  const pricingRepository = new PricingRepository();
  const pricing = new PricingService(pricingRepository, productRepository);
  const product = products.create(tenant, racaoPremium(189.9));
  return { pricing, product };
};

describe('PricingService — os seis niveis do §6, um de cada vez', () => {
  it('nivel 1: sem nada configurado, resolve pelo preco global do produto', () => {
    const { pricing, product } = setup();
    const result = pricing.resolvePrice(tenant, {
      productId: product.id,
      branchId: null,
      quantity: 1,
    });
    expect(result).toEqual({
      price: 189.9,
      source: 'GLOBAL',
      requiresApproval: false,
      appliedRuleId: null,
    });
  });

  it('nivel 2: preco por filial sobrescreve o global', () => {
    const { pricing, product } = setup();
    pricing.setBranchPrice(tenant, product.id, 'goiania', 184.9);
    const result = pricing.resolvePrice(tenant, {
      productId: product.id,
      branchId: 'goiania',
      quantity: 1,
    });
    expect(result.price).toBe(184.9);
    expect(result.source).toBe('FILIAL');
  });

  it('nivel 3: tabela de preco com vigencia sobrescreve a filial', () => {
    const { pricing, product } = setup();
    pricing.setBranchPrice(tenant, product.id, 'goiania', 184.9);
    const entry = pricing.createPriceTableEntry(tenant, {
      productId: product.id,
      name: 'Atacado GO',
      price: 175,
      branchId: 'goiania',
      customerGroupId: null,
      sellerId: null,
      channel: 'atacado',
      minQuantity: 10,
      startsAt: null,
      endsAt: null,
    });
    const result = pricing.resolvePrice(tenant, {
      productId: product.id,
      branchId: 'goiania',
      channel: 'atacado',
      quantity: 10,
    });
    expect(result.price).toBe(175);
    expect(result.source).toBe('TABELA_PRECO');
    expect(result.appliedRuleId).toBe(entry.id);
  });

  it('tabela de preco fora da vigencia nao se aplica', () => {
    const { pricing, product } = setup();
    pricing.createPriceTableEntry(tenant, {
      productId: product.id,
      name: 'Campanha vencida',
      price: 100,
      branchId: null,
      customerGroupId: null,
      sellerId: null,
      channel: null,
      minQuantity: null,
      startsAt: '2020-01-01',
      endsAt: '2020-01-31',
    });
    const result = pricing.resolvePrice(tenant, {
      productId: product.id,
      branchId: null,
      quantity: 1,
      at: '2026-09-06',
    });
    expect(result.source).toBe('GLOBAL');
  });

  it('tabela de preco exige a quantidade minima do lote', () => {
    const { pricing, product } = setup();
    pricing.createPriceTableEntry(tenant, {
      productId: product.id,
      name: 'Volume 10+',
      price: 170,
      branchId: null,
      customerGroupId: null,
      sellerId: null,
      channel: null,
      minQuantity: 10,
      startsAt: null,
      endsAt: null,
    });
    const abaixo = pricing.resolvePrice(tenant, {
      productId: product.id,
      branchId: null,
      quantity: 5,
    });
    const noLote = pricing.resolvePrice(tenant, {
      productId: product.id,
      branchId: null,
      quantity: 10,
    });
    expect(abaixo.source).toBe('GLOBAL');
    expect(noLote.source).toBe('TABELA_PRECO');
  });

  it('nivel 4: preco especifico do cliente sobrescreve a tabela', () => {
    const { pricing, product } = setup();
    pricing.createPriceTableEntry(tenant, {
      productId: product.id,
      name: 'Tabela geral',
      price: 180,
      branchId: null,
      customerGroupId: null,
      sellerId: null,
      channel: null,
      minQuantity: null,
      startsAt: null,
      endsAt: null,
    });
    pricing.setCustomerPrice(tenant, product.id, 'cliente-atacadista', 179.9);
    const result = pricing.resolvePrice(tenant, {
      productId: product.id,
      branchId: null,
      customerId: 'cliente-atacadista',
      quantity: 1,
    });
    expect(result.price).toBe(179.9);
    expect(result.source).toBe('CLIENTE_ESPECIFICO');
  });

  it('nivel 5: promocao ativa sobrescreve o preco do cliente', () => {
    const pricingRepository = new PricingRepository();
    const productRepository = new ProductRepository();
    const products = new ProductService(productRepository);
    const pricing = new PricingService(pricingRepository, productRepository);
    const product = products.create(tenant, racaoPremium(189.9));

    pricing.setCustomerPrice(tenant, product.id, 'cliente-atacadista', 179.9);
    pricingRepository.addPromotion({
      id: 'promo-1',
      tenantId: tenant.tenantId as never,
      productId: product.id,
      price: 165,
      startsAt: '2026-01-01',
      endsAt: '2026-12-31',
      branchId: null,
    });
    const result = pricing.resolvePrice(tenant, {
      productId: product.id,
      branchId: null,
      customerId: 'cliente-atacadista',
      quantity: 1,
      at: '2026-06-01',
    });
    expect(result.price).toBe(165);
    expect(result.source).toBe('PROMOCAO');
  });

  it('tabela de preco por grupo de cliente e por vendedor (c9-4)', () => {
    const { pricing, product } = setup();
    pricing.createPriceTableEntry(tenant, {
      productId: product.id,
      name: 'Grupo Atacadista',
      price: 176,
      branchId: null,
      customerGroupId: 'atacadista',
      sellerId: null,
      channel: null,
      minQuantity: null,
      startsAt: null,
      endsAt: null,
    });
    pricing.createPriceTableEntry(tenant, {
      productId: product.id,
      name: 'Carteira do vendedor-1',
      price: 172,
      branchId: null,
      customerGroupId: null,
      sellerId: 'vendedor-1',
      channel: null,
      minQuantity: null,
      startsAt: null,
      endsAt: null,
    });

    const porGrupo = pricing.resolvePrice(tenant, {
      productId: product.id,
      branchId: null,
      customerGroupId: 'atacadista',
      quantity: 1,
    });
    expect(porGrupo.price).toBe(176);

    const porVendedor = pricing.resolvePrice(tenant, {
      productId: product.id,
      branchId: null,
      sellerId: 'vendedor-1',
      quantity: 1,
    });
    expect(porVendedor.price).toBe(172);

    const semNenhum = pricing.resolvePrice(tenant, {
      productId: product.id,
      branchId: null,
      quantity: 1,
    });
    expect(semNenhum.source).toBe('GLOBAL');
  });

  it('nivel 6: negociacao dentro do limite do vendedor e aplicada direto', () => {
    const { pricing, product } = setup();
    pricing.setSellerDiscountLimit(tenant, tenant.userId, 10);
    const result = pricing.resolvePrice(tenant, {
      productId: product.id,
      branchId: null,
      quantity: 1,
      negotiatedPrice: 180.9,
    });
    expect(result.price).toBe(180.9);
    expect(result.source).toBe('NEGOCIACAO_AUTORIZADA');
    expect(result.requiresApproval).toBe(false);
  });

  it('negociacao acima do limite fica pendente de aprovacao, sem aplicar o preco pedido', () => {
    const { pricing, product } = setup();
    pricing.setSellerDiscountLimit(tenant, tenant.userId, 5);
    const result = pricing.resolvePrice(tenant, {
      productId: product.id,
      branchId: null,
      quantity: 1,
      negotiatedPrice: 150,
    });
    expect(result.price).toBe(189.9);
    expect(result.source).toBe('GLOBAL');
    expect(result.requiresApproval).toBe(true);
  });

  it('sem limite configurado para o vendedor, qualquer desconto exige aprovacao', () => {
    const { pricing, product } = setup();
    const result = pricing.resolvePrice(tenant, {
      productId: product.id,
      branchId: null,
      quantity: 1,
      negotiatedPrice: 189.8,
    });
    expect(result.requiresApproval).toBe(true);
  });
});

describe('PricingService — desempate entre tabelas de preco (especificidade)', () => {
  it('prefere a tabela mais especifica quando mais de uma se aplica', () => {
    const { pricing, product } = setup();
    pricing.createPriceTableEntry(tenant, {
      productId: product.id,
      name: 'Geral',
      price: 180,
      branchId: null,
      customerGroupId: null,
      sellerId: null,
      channel: null,
      minQuantity: null,
      startsAt: null,
      endsAt: null,
    });
    const especifica = pricing.createPriceTableEntry(tenant, {
      productId: product.id,
      name: 'Atacado Goiania',
      price: 170,
      branchId: 'goiania',
      customerGroupId: null,
      sellerId: null,
      channel: 'atacado',
      minQuantity: null,
      startsAt: null,
      endsAt: null,
    });
    const result = pricing.resolvePrice(tenant, {
      productId: product.id,
      branchId: 'goiania',
      channel: 'atacado',
      quantity: 1,
    });
    expect(result.appliedRuleId).toBe(especifica.id);
    expect(result.price).toBe(170);
  });

  it('ignora uma tabela cujo criterio nao bate, mesmo com outros batendo', () => {
    const { pricing, product } = setup();
    pricing.createPriceTableEntry(tenant, {
      productId: product.id,
      name: 'So Anapolis',
      price: 170,
      branchId: 'anapolis',
      customerGroupId: null,
      sellerId: null,
      channel: null,
      minQuantity: null,
      startsAt: null,
      endsAt: null,
    });
    const result = pricing.resolvePrice(tenant, {
      productId: product.id,
      branchId: 'goiania',
      quantity: 1,
    });
    expect(result.source).toBe('GLOBAL');
  });
});

describe('PricingService — exemplo real do card', () => {
  it('Racao Premium 20kg: global 189.90, Goiania 184.90, cliente atacadista 179.90', () => {
    const { pricing, product } = setup();
    pricing.setBranchPrice(tenant, product.id, 'goiania', 184.9);
    pricing.setCustomerPrice(tenant, product.id, 'atacadista-1', 179.9);

    expect(
      pricing.resolvePrice(tenant, { productId: product.id, branchId: null, quantity: 1 }).price,
    ).toBe(189.9);
    expect(
      pricing.resolvePrice(tenant, { productId: product.id, branchId: 'goiania', quantity: 1 })
        .price,
    ).toBe(184.9);
    expect(
      pricing.resolvePrice(tenant, {
        productId: product.id,
        branchId: 'goiania',
        customerId: 'atacadista-1',
        quantity: 1,
      }).price,
    ).toBe(179.9);
  });
});
