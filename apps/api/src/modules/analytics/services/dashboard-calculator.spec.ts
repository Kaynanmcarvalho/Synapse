import type { Order, Seller } from '@synapse/types';
import { salesBuckets, summarizeSales } from './dashboard-calculator';

const order = (overrides: Partial<Record<keyof Order, unknown>>): Order =>
  ({
    id: 'o',
    tenantId: 't',
    branchId: 'b',
    customerId: 'c',
    status: 'INVOICED',
    createdAt: '2026-09-06T12:00:00Z',
    createdBy: { uid: 's' },
    total: 10000,
    returnedItems: [],
    items: [{ productId: 'p', quantity: 2000, total: 10000 }],
    ...overrides,
  }) as Order;
describe('Dashboard agregado', () => {
  it('separa filial, vendedor e data; exclui orçamento e desconta devoluções', () => {
    const rows = salesBuckets(
      [
        order({}),
        order({ id: 'o2', branchId: 'b2' }),
        order({ status: 'QUOTE' }),
        order({ id: 'o3', returnedItems: [{ productId: 'p' as never, quantity: 1000 }] }),
      ],
      [{ userId: 's', commissionPercent: 5 } as Seller],
    );
    expect(rows).toHaveLength(2);
    expect(summarizeSales(rows)).toEqual({
      revenueCentavos: 25000,
      sales: 3,
      averageTicketCentavos: 8333,
      commissionCentavos: 1250,
      customers: 1,
    });
    expect(rows.find((r) => r.branchId === 'b')?.revenueCentavos).toBe(15000);
  });
  it('não inventa números quando não existem vendas', () => {
    expect(summarizeSales([])).toEqual({
      revenueCentavos: 0,
      sales: 0,
      averageTicketCentavos: 0,
      commissionCentavos: 0,
      customers: 0,
    });
  });
});
