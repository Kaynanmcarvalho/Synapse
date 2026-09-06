import type { PosItem } from '@synapse/types';
import { PricingRepository } from '../../catalog/repositories/pricing.repository';
import { ProductRepository } from '../../catalog/repositories/product.repository';
import { PricingService } from '../../catalog/services/pricing.service';
import { OrderRepository } from '../repositories/order.repository';
import { OrderService, type SalesInventoryPort } from './order.service';

const context = {
  tenantId: 't',
  userId: 'u',
  roleIds: ['sales.discount.approve'],
  branchIds: [],
  warehouseIds: [],
};
const item = {
  productId: 'p',
  barcode: null,
  description: 'Item',
  quantity: 1_000,
  unitPrice: 1_000,
  discount: 200,
  surcharge: 0,
  total: 800,
} as PosItem;
describe('OrderService', () => {
  it('orçamento não reserva; pedido reserva; faturamento baixa; cancelamento libera', async () => {
    const calls: string[] = [];
    const inventory = Object.fromEntries(
      ['reserve', 'fulfill', 'release', 'return'].map((name) => [
        name,
        async () => {
          calls.push(name);
        },
      ]),
    ) as unknown as SalesInventoryPort;
    const pricing = new PricingService(new PricingRepository(), new ProductRepository());
    // 20% de desconto no item; limite do vendedor em 1% -> exige aprovação.
    // O limite é resolvido no service a partir do PricingService, nunca do
    // corpo da requisição (§27/§1) — é isso que este teste está provando.
    pricing.setSellerDiscountLimit(context, context.userId, 1);
    const service = new OrderService(new OrderRepository(), pricing);
    const quote = service.quote(context, {
      branchId: 'b',
      customerId: 'c',
      channel: 'WHATSAPP',
      items: [item],
    });
    expect(calls).toEqual([]);
    expect(quote.requiresApproval).toBe(true);
    const order = await service.convertToOrder(context, quote.id, inventory);
    expect(calls).toEqual(['reserve']);
    service.approve(context, order.id);
    service.pick(context, order.id, ['p']);
    const invoiced = await service.invoice(context, order.id, inventory);
    expect(service.deliver(context, invoiced.id).status).toBe('DELIVERED');
    expect(calls).toContain('fulfill');
    await service.returnItems(
      context,
      order.id,
      [{ productId: item.productId, quantity: 500 }],
      inventory,
    );
    expect(calls).toContain('return');
  });
});
