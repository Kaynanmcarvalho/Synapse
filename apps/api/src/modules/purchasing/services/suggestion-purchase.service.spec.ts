import { BadRequestException, ForbiddenException } from '@nestjs/common';
import type { StockIntelligenceRepository } from '../../analytics/repositories/stock-intelligence.repository';
import type { PurchaseOrderService } from './purchase-order.service';
import { SuggestionPurchaseService } from './suggestion-purchase.service';

const context = { tenantId: 't', userId: 'u', roleIds: [], branchIds: ['b'], warehouseIds: ['w'] };
describe('Compra a partir de sugestões', () => {
  const setup = () => {
    const findOne = jest.fn(async () => ({
      branchId: 'b',
      productId: 'p',
      approvedPurchaseQty: 7,
      suggestedPurchaseQty: 20,
    }));
    const create = jest.fn(async (tenant, input) => ({ tenant, input }));
    const service = new SuggestionPurchaseService(
      { findOne } as unknown as StockIntelligenceRepository,
      { create } as unknown as PurchaseOrderService,
    );
    return { service, findOne, create };
  };
  it('usa quantidade revisada do servidor e remove IDs repetidos', async () => {
    const { service, create, findOne } = setup();
    await service.create(context, { branchId: 'b', warehouseId: 'w', suggestionIds: ['s', 's'] });
    expect(findOne).toHaveBeenCalledWith('t', 's');
    expect(create).toHaveBeenCalledWith(
      context,
      expect.objectContaining({
        items: [{ productId: 'p', quantityOrdered: 7 }],
        sourceSuggestionIds: ['s'],
      }),
    );
  });
  it('recusa filial não autorizada antes de ler sugestões', async () => {
    const { service, findOne } = setup();
    await expect(
      service.create(context, { branchId: 'other', warehouseId: 'w', suggestionIds: ['s'] }),
    ).rejects.toBeInstanceOf(ForbiddenException);
    expect(findOne).not.toHaveBeenCalled();
  });
  it('recusa sugestão de outra filial e não cria pedido', async () => {
    const { service, findOne, create } = setup();
    findOne.mockResolvedValue({
      branchId: 'other',
      productId: 'p',
      approvedPurchaseQty: 7,
      suggestedPurchaseQty: 20,
    });
    await expect(
      service.create(context, { branchId: 'b', warehouseId: 'w', suggestionIds: ['s'] }),
    ).rejects.toBeInstanceOf(BadRequestException);
    expect(create).not.toHaveBeenCalled();
  });
});
