import { BadRequestException, ForbiddenException, Injectable } from '@nestjs/common';
import { StockIntelligenceRepository } from '../../analytics/repositories/stock-intelligence.repository';
import type { TenantContext } from '../../iam/iam.types';
import { PurchaseOrderService } from './purchase-order.service';

@Injectable()
export class SuggestionPurchaseService {
  constructor(
    private readonly metrics: StockIntelligenceRepository,
    private readonly orders: PurchaseOrderService,
  ) {}

  async create(
    context: TenantContext,
    input: { branchId: string; warehouseId: string; suggestionIds: string[] },
  ) {
    if (context.branchIds.length && !context.branchIds.includes(input.branchId))
      throw new ForbiddenException('Filial não permitida');
    if (context.warehouseIds.length && !context.warehouseIds.includes(input.warehouseId))
      throw new ForbiddenException('Depósito não permitido');
    const ids = [...new Set(input.suggestionIds)];
    const metrics = await Promise.all(ids.map((id) => this.metrics.findOne(context.tenantId, id)));
    const items = metrics.map((metric) => {
      if (!metric || metric.branchId !== input.branchId)
        throw new BadRequestException('Sugestão não pertence à filial selecionada');
      const quantityOrdered = metric.approvedPurchaseQty ?? metric.suggestedPurchaseQty;
      if (!Number.isSafeInteger(quantityOrdered) || quantityOrdered <= 0)
        throw new BadRequestException('Revise as quantidades antes de gerar o pedido');
      return { productId: metric.productId, quantityOrdered };
    });
    return this.orders.create(context, {
      branchId: input.branchId,
      warehouseId: input.warehouseId,
      sourceSuggestionIds: ids,
      items,
    });
  }
}
