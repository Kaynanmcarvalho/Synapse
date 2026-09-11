import { Injectable, NotFoundException } from '@nestjs/common';
import type {
  PurchaseOrder,
  PurchaseOrderStatus,
  SupplierId,
  SupplierQuote,
  UserId,
} from '@synapse/types';
import type { TenantContext } from '../../iam/iam.types';
import type {
  AddQuoteInput,
  CreatePurchaseOrderInput,
  SelectSupplierInput,
} from '../dto/purchasing.schemas';
import {
  adicionarCotacao,
  criarRascunho,
  selecionarFornecedor,
} from '../entities/pedido-de-compra';
import { PurchaseOrderRepository } from '../repositories/purchase-order.repository';

@Injectable()
export class PurchaseOrderService {
  constructor(private readonly repository: PurchaseOrderRepository) {}

  async create(context: TenantContext, input: CreatePurchaseOrderInput): Promise<PurchaseOrder> {
    const draft = criarRascunho({
      tenantId: context.tenantId as PurchaseOrder['tenantId'],
      branchId: input.branchId as PurchaseOrder['branchId'],
      warehouseId: input.warehouseId,
      items: input.items.map((item) => ({
        productId: item.productId as PurchaseOrder['items'][number]['productId'],
        quantityOrdered: item.quantityOrdered,
      })),
      sourceSuggestionIds: input.sourceSuggestionIds,
      createdBy: context.userId as PurchaseOrder['createdBy'],
      now: new Date().toISOString(),
    });
    return this.repository.create(context.tenantId, draft);
  }

  async get(context: TenantContext, id: string): Promise<PurchaseOrder> {
    const order = await this.repository.findById(context.tenantId, id);
    if (!order) throw new NotFoundException('Pedido de compra não encontrado');
    return order;
  }

  list(context: TenantContext, branchId: string, status?: PurchaseOrderStatus) {
    return this.repository.list(context.tenantId, branchId, status);
  }

  async addQuote(
    context: TenantContext,
    orderId: string,
    input: AddQuoteInput,
  ): Promise<PurchaseOrder> {
    const order = await this.get(context, orderId);
    const quote: SupplierQuote = {
      supplierId: input.supplierId as SupplierQuote['supplierId'],
      leadDays: input.leadDays,
      items: input.items.map((item) => ({
        productId: item.productId as SupplierQuote['items'][number]['productId'],
        unitCostCentavos: item.unitCostCentavos,
      })),
      submittedAt: new Date().toISOString(),
      submittedBy: context.userId as SupplierQuote['submittedBy'],
    };
    const updated = adicionarCotacao(order, quote);
    return this.repository.update(context.tenantId, updated, order.version);
  }

  async selectSupplier(
    context: TenantContext,
    orderId: string,
    input: SelectSupplierInput,
  ): Promise<PurchaseOrder> {
    const order = await this.get(context, orderId);
    const updated = selecionarFornecedor(
      order,
      input.supplierId as SupplierId,
      context.userId as UserId,
      new Date().toISOString(),
    );
    return this.repository.update(context.tenantId, updated, order.version);
  }

  /** Histórico de preço por fornecedor (§40): todo pedido já recebido dele,
   *  com o custo efetivamente pago (não o cotado) para cada produto. */
  async priceHistory(context: TenantContext, supplierId: string) {
    const orders = await this.repository.listReceivedFromSupplier(context.tenantId, supplierId);
    return orders.flatMap((order) =>
      order.items
        .filter((item) => item.quantityReceived > 0)
        .map((item) => ({
          purchaseOrderId: order.id,
          productId: item.productId,
          unitCostCentavos: item.unitCostCentavos,
          receivedAt: order.approvedAt ?? order.createdAt,
        })),
    );
  }
}
