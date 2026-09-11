import { Injectable } from '@nestjs/common';
import type { PosItem } from '@synapse/types';
import type { TenantContext } from '../../iam/iam.types';
import { PricingService } from '../../catalog/services/pricing.service';
import { InventoryService } from '../../inventory/services/inventory.service';
import type { OfflineOrderInput } from '../dto/offline-sync.schemas';
import { OrderService } from './order.service';

export interface OfflineSyncResult {
  readonly localId: string;
  readonly status: 'ACCEPTED' | 'CONFLICT' | 'REJECTED';
  readonly orderId: string | null;
  readonly reason: string | null;
  readonly items: readonly PosItem[];
}

@Injectable()
export class OfflineSyncService {
  private readonly processed = new Map<string, OfflineSyncResult>();
  constructor(
    private readonly prices: PricingService,
    private readonly inventory: InventoryService,
    private readonly orders: OrderService,
  ) {}
  async sync(context: TenantContext, input: OfflineOrderInput): Promise<OfflineSyncResult> {
    const previous = this.processed.get(`${context.tenantId}:${input.idempotencyKey}`);
    if (previous) return previous;
    const items: PosItem[] = [];
    for (const line of input.items) {
      const resolved = this.prices.resolvePrice(context, {
        productId: line.productId,
        branchId: input.branchId,
        customerId: input.customerId,
        sellerId: input.sellerId,
        channel: 'atacado',
        quantity: line.quantity,
      });
      const stock = await this.inventory.balance(
        context,
        input.branchId,
        input.warehouseId,
        line.productId,
      );
      if (!stock || stock.available < line.quantity)
        return this.remember(context, input, {
          localId: input.localId,
          status: 'REJECTED',
          orderId: null,
          reason: `Estoque insuficiente para ${line.description}`,
          items,
        });
      items.push({
        productId: line.productId as PosItem['productId'],
        barcode: null,
        description: line.description,
        quantity: line.quantity,
        unitPrice: resolved.price,
        discount: line.discount,
        surcharge: 0,
        total: Math.round((line.quantity * resolved.price) / 1000) - line.discount,
      });
    }
    if (items.some((item, index) => item.unitPrice !== input.items[index]?.cachedUnitPrice))
      return this.remember(context, input, {
        localId: input.localId,
        status: 'CONFLICT',
        orderId: null,
        reason: 'Preço alterado desde a última sincronização',
        items,
      });
    const quote = this.orders.quote(context, {
      branchId: input.branchId,
      customerId: input.customerId,
      channel: 'EXTERNAL',
      items,
    });
    const order = await this.orders.convertToOrder(context, quote.id, {
      reserve: async (id, lines) => {
        for (const line of lines)
          await this.inventory.reserve(context, {
            branchId: input.branchId,
            warehouseId: input.warehouseId,
            productId: line.productId,
            quantity: line.quantity,
            sourceId: id,
            destinationId: null,
            document: null,
            reason: 'Pedido offline sincronizado',
            idempotencyKey: `${input.idempotencyKey}:${line.productId}`,
            allowNegative: false,
          });
      },
      fulfill: async () => undefined,
      release: async () => undefined,
      return: async () => undefined,
    });
    return this.remember(context, input, {
      localId: input.localId,
      status: 'ACCEPTED',
      orderId: order.id,
      reason: null,
      items,
    });
  }
  private remember(context: TenantContext, input: OfflineOrderInput, result: OfflineSyncResult) {
    this.processed.set(`${context.tenantId}:${input.idempotencyKey}`, result);
    return result;
  }
}
