import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import type { AuditActor, Order, OrderChannel, PosItem } from '@synapse/types';
import { randomUUID } from 'node:crypto';
import { PricingService } from '../../catalog/services/pricing.service';
import type { TenantContext } from '../../iam/iam.types';
import { OrderRepository } from '../repositories/order.repository';

export interface SalesInventoryPort {
  reserve(orderId: string, items: readonly PosItem[]): Promise<void>;
  fulfill(orderId: string, items: readonly PosItem[]): Promise<void>;
  release(orderId: string, items: readonly PosItem[]): Promise<void>;
  return(
    orderId: string,
    items: readonly { productId: PosItem['productId']; quantity: number }[],
  ): Promise<void>;
}
@Injectable()
export class OrderService {
  constructor(
    private readonly repository: OrderRepository,
    private readonly pricing: PricingService,
  ) {}
  /** §27/§1: o limite de desconto NUNCA vem do corpo da requisição — um
   *  vendedor editando a chamada não consegue mais se auto-aprovar. O limite
   *  é sempre resolvido aqui, a partir de quem está autenticado
   *  (`context.userId`), contra o que `PricingService`/`preco.gerenciar`
   *  configurou pra esse vendedor especificamente. */
  quote(
    context: TenantContext,
    input: {
      branchId: string;
      customerId: string;
      channel: OrderChannel;
      items: readonly PosItem[];
    },
  ): Order {
    const actor = this.actor(context);
    const limitPercent = this.pricing.getSellerDiscountLimit(context, context.userId);
    const limitBasisPoints = Math.round(limitPercent * 100);
    return this.repository.save({
      id: randomUUID() as Order['id'],
      tenantId: context.tenantId as Order['tenantId'],
      branchId: input.branchId as Order['branchId'],
      customerId: input.customerId as Order['customerId'],
      status: 'QUOTE',
      channel: input.channel,
      total: input.items.reduce((sum, item) => sum + item.total, 0),
      requiresApproval: this.discountBasisPoints(input.items) > limitBasisPoints,
      items: input.items,
      returnedItems: [],
      createdAt: new Date().toISOString(),
      createdBy: actor,
      updatedAt: new Date().toISOString(),
      updatedBy: actor,
      version: 1,
    });
  }
  async convertToOrder(context: TenantContext, id: string, inventory: SalesInventoryPort) {
    const order = this.get(id);
    if (order.status !== 'QUOTE')
      throw new BadRequestException('Somente orçamento pode virar pedido');
    await inventory.reserve(id, order.items);
    return this.update(order, 'ORDER', context);
  }
  approve(context: TenantContext, id: string) {
    const order = this.get(id);
    if (order.requiresApproval && !context.roleIds.includes('sales.discount.approve'))
      throw new ForbiddenException('Permissão para aprovar desconto obrigatória');
    return this.update(order, 'APPROVED', context);
  }
  pick(context: TenantContext, id: string, checkedProductIds: readonly string[]) {
    const order = this.get(id);
    if (!order.items.every((item) => checkedProductIds.includes(item.productId)))
      throw new BadRequestException('Conferência de separação incompleta');
    return this.update(order, 'PICKING', context);
  }
  async invoice(context: TenantContext, id: string, inventory: SalesInventoryPort) {
    const order = this.get(id);
    if (order.status !== 'PICKING') throw new BadRequestException('Pedido não separado');
    await inventory.fulfill(id, order.items);
    return this.update(order, 'INVOICED', context);
  }
  deliver(context: TenantContext, id: string) {
    const order = this.get(id);
    if (order.status !== 'INVOICED') throw new BadRequestException('Venda ainda não faturada');
    return this.update(order, 'DELIVERED', context);
  }
  async cancel(context: TenantContext, id: string, inventory: SalesInventoryPort) {
    const order = this.get(id);
    if (['ORDER', 'APPROVED', 'PICKING'].includes(order.status))
      await inventory.release(id, order.items);
    return this.update(order, 'CANCELLED', context);
  }
  async returnItems(
    context: TenantContext,
    id: string,
    items: readonly { productId: PosItem['productId']; quantity: number }[],
    inventory: SalesInventoryPort,
  ) {
    const order = this.get(id);
    for (const item of items) {
      const sold = order.items.find((line) => line.productId === item.productId)?.quantity ?? 0;
      const already = order.returnedItems
        .filter((line) => line.productId === item.productId)
        .reduce((sum, line) => sum + line.quantity, 0);
      if (item.quantity <= 0 || item.quantity + already > sold)
        throw new BadRequestException('Devolução excede a quantidade vendida');
    }
    await inventory.return(id, items);
    return this.repository.save({
      ...order,
      returnedItems: [...order.returnedItems, ...items],
      updatedBy: this.actor(context),
      updatedAt: new Date().toISOString(),
      version: order.version + 1,
    });
  }
  listByTenant(tenantId: string): Order[] {
    return this.repository.listByTenant(tenantId);
  }
  private update(order: Order, status: Order['status'], context: TenantContext) {
    return this.repository.save({
      ...order,
      status,
      updatedBy: this.actor(context),
      updatedAt: new Date().toISOString(),
      version: order.version + 1,
    });
  }
  private get(id: string) {
    const order = this.repository.find(id);
    if (!order) throw new NotFoundException('Venda não encontrada');
    return order;
  }
  private discountBasisPoints(items: readonly PosItem[]) {
    const gross = items.reduce((sum, item) => sum + item.total + item.discount - item.surcharge, 0);
    const discount = items.reduce((sum, item) => sum + item.discount, 0);
    return gross ? Math.round((discount * 10_000) / gross) : 0;
  }
  private actor(context: TenantContext): AuditActor {
    return { uid: context.userId as AuditActor['uid'], email: '', name: '', source: 'api' };
  }
}
