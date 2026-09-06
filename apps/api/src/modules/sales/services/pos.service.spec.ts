import { BadRequestException } from '@nestjs/common';
import { CashSessionRepository } from '../repositories/cash-session.repository';
import { PosService } from './pos.service';

const context = {
  tenantId: 'tenant',
  userId: 'operator',
  roleIds: [],
  branchIds: ['branch'],
  warehouseIds: [],
};

describe('PosService', () => {
  it('conclui pagamento misto, emite NFC-e e confere o caixa', async () => {
    const service = new PosService(new CashSessionRepository());
    const cash = service.openCash(context, 'branch', 10_000);
    const sale = await service.completeSale(
      cash.id,
      {
        companyId: 'company',
        sellerId: 'seller',
        operatorDiscountLimitBasisPoints: 1_000,
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
    );
    expect(sale.nfceDocumentId).toBe('nfce-1');
    expect(service.closeCash(cash.id, 10_100).difference).toBe(100);
    expect(service.reprintSale(sale.id)).toEqual(sale);
  });

  it('recusa desconto acima do limite', async () => {
    const service = new PosService(new CashSessionRepository());
    const cash = service.openCash(context, 'branch', 0);
    await expect(
      service.completeSale(
        cash.id,
        {
          companyId: 'company',
          sellerId: 'seller',
          operatorDiscountLimitBasisPoints: 100,
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
      ),
    ).rejects.toBeInstanceOf(BadRequestException);
  });
});
