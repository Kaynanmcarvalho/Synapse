import { BadRequestException } from '@nestjs/common';
import { CashSessionRepository } from '../repositories/cash-session.repository';
import { PosService } from './pos.service';
import { PricingService } from '../../catalog/services/pricing.service';
import { PricingRepository } from '../../catalog/repositories/pricing.repository';
import { ProductRepository } from '../../catalog/repositories/product.repository';
import type { Product } from '@synapse/types';

function createService(price: number, limit: number, productId: string) {
  const products = new ProductRepository();
  products.save({ id: productId, tenantId: 'tenant', pricing: { salePrice: price } } as Product);
  const pricing = new PricingService(new PricingRepository(), products);
  pricing.setSellerDiscountLimit(context, context.userId, limit);
  return new PosService(new CashSessionRepository(), pricing);
}

const context = {
  tenantId: 'tenant',
  userId: 'operator',
  roleIds: [],
  branchIds: ['branch'],
  warehouseIds: [],
};

describe('PosService', () => {
  it('conclui pagamento misto, emite NFC-e e confere o caixa', async () => {
    const service = createService(500, 10, 'product');
    const cash = service.openCash(context, 'branch', 10_000);
    const sale = await service.completeSale(
      cash.id,
      {
        companyId: 'company',
        sellerId: 'seller',
        items: [
          {
            productId: 'product',
            description: 'Ração',
            quantity: 1_000,
            unitPrice: 50_000,
            discount: 0,
            surcharge: 0,
          },
        ],
        payments: [
          { method: 'PIX', amount: 30_000 },
          { method: 'CREDIT_CARD', amount: 20_000 },
        ],
      },
      { issueNfce: async () => 'nfce-1' },
      context,
    );
    expect(sale.nfceDocumentId).toBe('nfce-1');
    expect(service.closeCash(cash.id, 10_100).difference).toBe(100);
    expect(service.reprintSale(sale.id)).toEqual(sale);
  });

  it('recusa desconto acima do limite', async () => {
    const service = createService(100, 1, 'p');
    const cash = service.openCash(context, 'branch', 0);
    await expect(
      service.completeSale(
        cash.id,
        {
          companyId: 'company',
          sellerId: 'seller',
          items: [
            {
              productId: 'p',
              description: 'Item',
              quantity: 1_000,
              unitPrice: 10_000,
              discount: 500,
              surcharge: 0,
            },
          ],
          payments: [{ method: 'CASH', amount: 9_500 }],
        },
        { issueNfce: async () => 'nfce' },
        context,
      ),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('nao acha caixa aberto antes de abrir, e acha depois de abrir', () => {
    const service = createService(100, 10, 'p');
    expect(service.getCurrentSession(context, 'branch')).toBeNull();
    const cash = service.openCash(context, 'branch', 0);
    expect(service.getCurrentSession(context, 'branch')?.id).toBe(cash.id);
  });

  it('nao acha caixa aberto de outra filial ou ja fechado', () => {
    const service = createService(100, 10, 'p');
    const cash = service.openCash(context, 'branch', 0);
    expect(service.getCurrentSession(context, 'outra-filial')).toBeNull();
    service.closeCash(cash.id, 0);
    expect(service.getCurrentSession(context, 'branch')).toBeNull();
  });
});
