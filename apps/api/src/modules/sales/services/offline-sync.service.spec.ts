import type { UserId } from '@synapse/types';
import type { PricingService } from '../../catalog/services/pricing.service';
import type { InventoryService } from '../../inventory/services/inventory.service';
import type { OrderService } from './order.service';
import { OfflineSyncService } from './offline-sync.service';

const context = {
  tenantId: 'tenant',
  userId: 'seller' as UserId,
  roleIds: [],
  branchIds: ['branch'],
  warehouseIds: ['warehouse'],
};
const input = {
  localId: '52dc46f4-6279-47f9-8060-ef7399c467b0',
  idempotencyKey: 'android-order:52dc46f4-6279-47f9-8060-ef7399c467b0',
  branchId: 'branch',
  warehouseId: 'warehouse',
  customerId: 'customer',
  sellerId: 'seller',
  createdAt: '2026-09-06T12:00:00.000Z',
  version: 1,
  items: [
    {
      productId: 'product',
      description: 'Ração',
      quantity: 1_000,
      cachedUnitPrice: 5_000,
      discount: 0,
    },
  ],
};

describe('OfflineSyncService', () => {
  const setup = (price = 5_000, available = 10_000) => {
    const prices = { resolvePrice: jest.fn(() => ({ price })) } as unknown as PricingService;
    const inventory = {
      balance: jest.fn().mockResolvedValue({ available }),
      reserve: jest.fn().mockResolvedValue({}),
    } as unknown as InventoryService;
    const orders = {
      quote: jest.fn(() => ({ id: 'quote-1' })),
      convertToOrder: jest.fn().mockResolvedValue({ id: 'order-1' }),
    } as unknown as OrderService;
    return { service: new OfflineSyncService(prices, inventory, orders), orders };
  };
  it('aceita três pedidos offline uma única vez mesmo com reenvio', async () => {
    const { service, orders } = setup();
    for (let index = 0; index < 3; index += 1) {
      const order = {
        ...input,
        localId: `${index}2dc46f4-6279-47f9-8060-ef7399c467b0`,
        idempotencyKey: `android-order:${index}2dc46f4-6279-47f9-8060-ef7399c467b0`,
      };
      await service.sync(context, order);
      await service.sync(context, order);
    }
    expect(orders.quote).toHaveBeenCalledTimes(3);
  });
  it('devolve conflito quando o preço mudou e rejeita falta de estoque', async () => {
    await expect(setup(5_500).service.sync(context, input)).resolves.toMatchObject({
      status: 'CONFLICT',
    });
    await expect(setup(5_000, 0).service.sync(context, input)).resolves.toMatchObject({
      status: 'REJECTED',
    });
  });
});
