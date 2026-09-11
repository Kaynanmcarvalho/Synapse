import { Injectable } from '@nestjs/common';
import type { Customer, Order, SellerDashboard } from '@synapse/types';
import { PartnerService } from '../../catalog/services/partner.service';
import type { TenantContext } from '../../iam/iam.types';
import { OrderService } from '../../sales/services/order.service';
import { SellerService } from './seller.service';

const SALE_STATUSES: ReadonlySet<Order['status']> = new Set(['INVOICED', 'DELIVERED']);
const PENDING_STATUSES: ReadonlySet<Order['status']> = new Set([
  'QUOTE',
  'ORDER',
  'APPROVED',
  'PICKING',
]);

/** §27 "dashboard do vendedor": vendas de hoje/mês, comissão, meta, clientes
 *  atendidos e pedidos pendentes — tudo derivado de dados que já existem
 *  (Order, Customer.responsibleSellerId), sem tabela nova pra "venda do
 *  vendedor" — a atribuição É o cliente ser dele. */
@Injectable()
export class SellerDashboardService {
  constructor(
    private readonly sellers: SellerService,
    private readonly orders: OrderService,
    private readonly partners: PartnerService,
  ) {}

  async getDashboard(context: TenantContext): Promise<SellerDashboard> {
    const seller = await this.sellers.getOwnProfile(context);
    const myOrders = await this.myOrders(context);

    const now = new Date();
    const todayKey = now.toISOString().slice(0, 10);
    const monthKey = now.toISOString().slice(0, 7);

    const completed = myOrders.filter((order) => SALE_STATUSES.has(order.status));
    const salesToday = completed.filter((order) => order.createdAt.slice(0, 10) === todayKey);
    const salesThisMonth = completed.filter((order) => order.createdAt.slice(0, 7) === monthKey);

    const salesTodayCentavos = sumTotals(salesToday);
    const salesThisMonthCentavos = sumTotals(salesThisMonth);
    const commissionThisMonthCentavos = Math.round(
      (salesThisMonthCentavos * seller.commissionPercent) / 100,
    );
    const goalProgressPercent =
      seller.monthlyGoalCentavos > 0
        ? Math.round((salesThisMonthCentavos / seller.monthlyGoalCentavos) * 100)
        : 0;

    const customersServedThisMonth = new Set(salesThisMonth.map((order) => order.customerId)).size;
    const pendingOrders = myOrders.filter((order) => PENDING_STATUSES.has(order.status)).length;

    return {
      salesTodayCentavos,
      salesThisMonthCentavos,
      commissionThisMonthCentavos,
      monthlyGoalCentavos: seller.monthlyGoalCentavos,
      goalProgressPercent,
      customersServedThisMonth,
      pendingOrders,
    };
  }

  /** §27 "cada vendedor tem clientes" — a carteira é todo cliente cujo
   *  `responsibleSellerId` aponta pra este vendedor. */
  async getMyCustomers(context: TenantContext): Promise<Customer[]> {
    const all = this.partners.listCustomers(context.tenantId);
    return all.filter((customer) => customer.responsibleSellerId === context.userId);
  }

  async getMyOrders(context: TenantContext, onlyPending: boolean): Promise<Order[]> {
    const orders = await this.myOrders(context);
    if (!onlyPending) return orders;
    return orders.filter((order) => PENDING_STATUSES.has(order.status));
  }

  private async myOrders(context: TenantContext): Promise<Order[]> {
    const myCustomerIds = new Set(
      (await this.getMyCustomers(context)).map((customer) => customer.id),
    );
    const allOrders = this.orders.listByTenant(context.tenantId);
    return allOrders.filter((order) => myCustomerIds.has(order.customerId));
  }
}

const sumTotals = (orders: readonly Order[]): number =>
  orders.reduce((sum, order) => sum + order.total, 0);
