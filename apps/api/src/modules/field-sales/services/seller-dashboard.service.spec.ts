import type { Customer, Order, Seller } from '@synapse/types';
import type { PartnerService } from '../../catalog/services/partner.service';
import type { TenantContext } from '../../iam/iam.types';
import type { OrderService } from '../../sales/services/order.service';
import type { SellerService } from './seller.service';
import { SellerDashboardService } from './seller-dashboard.service';

const context: TenantContext = {
  tenantId: 'tenant-1',
  userId: 'seller-1',
  roleIds: [],
  branchIds: [],
  warehouseIds: [],
};

const sellerFixture = (overrides: Partial<Seller> = {}): Seller =>
  ({
    id: 'seller-1',
    tenantId: 'tenant-1',
    userId: 'seller-1',
    name: 'Vendedor Um',
    branchId: 'matriz',
    region: 'Goiânia',
    route: null,
    commissionPercent: 5,
    monthlyGoalCentavos: 100_000,
    active: true,
    createdAt: '2026-01-01T00:00:00.000Z',
    ...overrides,
  }) as Seller;

const customerFixture = (id: string): Customer =>
  ({ id, tenantId: 'tenant-1', responsibleSellerId: 'seller-1' }) as unknown as Customer;

const orderFixture = (overrides: Record<string, unknown>): Order =>
  ({
    id: `order-${Math.random()}`,
    tenantId: 'tenant-1',
    branchId: 'matriz',
    customerId: 'c1',
    status: 'INVOICED',
    total: 10_000,
    channel: 'SELLER',
    requiresApproval: false,
    items: [],
    returnedItems: [],
    createdAt: new Date().toISOString(),
    ...overrides,
  }) as unknown as Order;

function buildService(options: { seller?: Seller; customers?: Customer[]; orders?: Order[] }) {
  const sellers = {
    getOwnProfile: jest.fn(() => Promise.resolve(options.seller ?? sellerFixture())),
  };
  const partners = {
    searchCustomers: jest.fn(() => options.customers ?? [customerFixture('c1')]),
  };
  const orders = { listByTenant: jest.fn(() => options.orders ?? []) };

  const service = new SellerDashboardService(
    sellers as unknown as SellerService,
    orders as unknown as OrderService,
    partners as unknown as PartnerService,
  );
  return { service };
}

describe('SellerDashboardService.getMyCustomers', () => {
  it('filtra só os clientes cujo responsibleSellerId é o vendedor logado', async () => {
    const { service } = buildService({
      customers: [
        customerFixture('c1'),
        { ...customerFixture('c2'), responsibleSellerId: 'outro-vendedor' } as unknown as Customer,
      ],
    });
    const customers = await service.getMyCustomers(context);
    expect(customers.map((c) => c.id)).toEqual(['c1']);
  });
});

describe('SellerDashboardService.getMyOrders', () => {
  it('só devolve pedidos de clientes da própria carteira', async () => {
    const { service } = buildService({
      customers: [customerFixture('c1')],
      orders: [orderFixture({ customerId: 'c1' }), orderFixture({ customerId: 'c-outro' })],
    });
    const orders = await service.getMyOrders(context, false);
    expect(orders).toHaveLength(1);
    expect(orders[0]?.customerId).toBe('c1');
  });

  it('filtra só pendentes quando pedido', async () => {
    const { service } = buildService({
      customers: [customerFixture('c1')],
      orders: [
        orderFixture({ customerId: 'c1', status: 'QUOTE' }),
        orderFixture({ customerId: 'c1', status: 'INVOICED' }),
      ],
    });
    const pending = await service.getMyOrders(context, true);
    expect(pending).toHaveLength(1);
    expect(pending[0]?.status).toBe('QUOTE');
  });
});

describe('SellerDashboardService.getDashboard', () => {
  it('soma vendas de hoje e do mês, calcula comissão e progresso da meta', async () => {
    const today = new Date().toISOString();
    const { service } = buildService({
      seller: sellerFixture({ commissionPercent: 10, monthlyGoalCentavos: 20_000 }),
      customers: [customerFixture('c1')],
      orders: [
        orderFixture({ customerId: 'c1', status: 'INVOICED', total: 5_000, createdAt: today }),
        orderFixture({ customerId: 'c1', status: 'DELIVERED', total: 5_000, createdAt: today }),
      ],
    });
    const dashboard = await service.getDashboard(context);
    expect(dashboard.salesTodayCentavos).toBe(10_000);
    expect(dashboard.salesThisMonthCentavos).toBe(10_000);
    expect(dashboard.commissionThisMonthCentavos).toBe(1_000); // 10% de 10.000
    expect(dashboard.goalProgressPercent).toBe(50); // 10.000 / 20.000
    expect(dashboard.customersServedThisMonth).toBe(1);
  });

  it('não conta orçamento (QUOTE) como venda, só como pedido pendente', async () => {
    const { service } = buildService({
      customers: [customerFixture('c1')],
      orders: [orderFixture({ customerId: 'c1', status: 'QUOTE', total: 9_999 })],
    });
    const dashboard = await service.getDashboard(context);
    expect(dashboard.salesThisMonthCentavos).toBe(0);
    expect(dashboard.pendingOrders).toBe(1);
  });

  it('não quebra com meta zerada (progresso fica 0, não Infinity/NaN)', async () => {
    const { service } = buildService({ seller: sellerFixture({ monthlyGoalCentavos: 0 }) });
    const dashboard = await service.getDashboard(context);
    expect(dashboard.goalProgressPercent).toBe(0);
    expect(Number.isFinite(dashboard.goalProgressPercent)).toBe(true);
  });

  it('não conta uma venda de outro vendedor, mesmo que apareça em listByTenant', async () => {
    const { service } = buildService({
      customers: [customerFixture('c1')],
      orders: [
        orderFixture({ customerId: 'c1', total: 1_000 }),
        orderFixture({ customerId: 'cliente-de-outro-vendedor', total: 999_999 }),
      ],
    });
    const dashboard = await service.getDashboard(context);
    expect(dashboard.salesThisMonthCentavos).toBe(1_000);
  });
});
