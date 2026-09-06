import { BadRequestException, Injectable } from '@nestjs/common';
import type { ParsedDfeItem, Product, PurchaseOrder, Receiving } from '@synapse/types';
import { randomUUID } from 'node:crypto';
import { PartnerService } from '../../catalog/services/partner.service';
import { computeMarginPercent, ProductService } from '../../catalog/services/product.service';
import { TituloService } from '../../finance/services/titulo.service';
import type { TenantContext } from '../../iam/iam.types';
import { InventoryService } from '../../inventory/services/inventory.service';
import type { ReceiveManualInput, ReceiveXmlInput } from '../dto/purchasing.schemas';
import {
  calcularDivergencias,
  custoMedioApos,
  registrarRecebimento,
} from '../entities/pedido-de-compra';
import { PurchaseOrderRepository } from '../repositories/purchase-order.repository';
import { ReceivingRepository } from '../repositories/receiving.repository';
import { NfeXmlParserService } from './nfe-xml-parser.service';

const DEFAULT_PAYMENT_TERM_DAYS = 30;

@Injectable()
export class ReceivingService {
  constructor(
    private readonly purchaseOrders: PurchaseOrderRepository,
    private readonly receivings: ReceivingRepository,
    private readonly inventory: InventoryService,
    private readonly products: ProductService,
    private readonly partners: PartnerService,
    private readonly titulos: TituloService,
    private readonly xmlParser: NfeXmlParserService,
  ) {}

  async receiveManual(
    context: TenantContext,
    orderId: string,
    input: ReceiveManualInput,
  ): Promise<Receiving> {
    return this.receive(context, orderId, input.warehouseId, 'MANUAL', null, input.lines);
  }

  /** §40 "reaproveitar a entrada por XML do DF-e": extrai os itens da NF-e
   *  do fornecedor e usa exatamente o mesmo caminho de recebimento do manual
   *  — a única diferença é de onde as linhas vieram. */
  async receiveFromXml(
    context: TenantContext,
    orderId: string,
    input: ReceiveXmlInput,
  ): Promise<Receiving> {
    const parsed = this.xmlParser.parse(input.xml);
    const order = await this.getOrder(context, orderId);
    const supplier = order.supplierId
      ? this.partners.getSupplier(context.tenantId, order.supplierId)
      : null;
    if (supplier && this.onlyDigits(supplier.taxId) !== this.onlyDigits(parsed.issuerTaxId)) {
      throw new BadRequestException(
        'CNPJ do emitente da NF-e não confere com o fornecedor do pedido',
      );
    }

    const lines = this.matchXmlItemsToOrder(order, parsed.items);
    return this.receive(context, orderId, input.warehouseId, 'XML_DFE', parsed.accessKey, lines);
  }

  /** Casa cada item da NF-e com o item do pedido pelo código do produto
   *  (SKU) — é o único identificador que aparece em ambos os lados. Item da
   *  nota que não bate com nenhum SKU do pedido é rejeitado explicitamente:
   *  aceitar em silêncio esconderia nota errada ou pedido incompleto. */
  private matchXmlItemsToOrder(
    order: PurchaseOrder,
    items: readonly ParsedDfeItem[],
  ): Array<{ productId: string; quantityReceived: number; unitCostReceived: number }> {
    return items.map((item) => {
      const match = order.items.find((orderItem) => orderItem.productId === item.code);
      if (!match) {
        throw new BadRequestException(
          `Item ${item.code} (${item.description}) da NF-e não está no pedido de compra`,
        );
      }
      return {
        productId: match.productId,
        quantityReceived: Math.round(item.quantity),
        unitCostReceived: item.unitCostCentavos,
      };
    });
  }

  private async receive(
    context: TenantContext,
    orderId: string,
    warehouseId: string,
    source: Receiving['source'],
    xmlAccessKey: string | null,
    lines: ReadonlyArray<{ productId: string; quantityReceived: number; unitCostReceived: number }>,
  ): Promise<Receiving> {
    const order = await this.getOrder(context, orderId);
    if (!order.supplierId) throw new BadRequestException('Pedido sem fornecedor aprovado');

    const divergencias = calcularDivergencias(
      order,
      lines.map((line) => ({
        productId: line.productId as PurchaseOrder['items'][number]['productId'],
        quantityReceived: line.quantityReceived,
        unitCostReceived: line.unitCostReceived,
      })),
    ).filter((line) => line.quantityReceived > 0);

    if (divergencias.length === 0) {
      throw new BadRequestException('Nenhuma quantidade recebida informada');
    }

    const now = new Date().toISOString();
    const receivingId = randomUUID();

    // Cada linha vira, em sequência: um movimento INBOUND de estoque, o
    // recalculo de custo médio do produto, e uma entrada no histórico de
    // preço (implícito no próprio PurchaseOrder atualizado abaixo). Uma
    // idempotencyKey por linha+recebimento evita duplicar o movimento se a
    // chamada for repetida.
    for (const linha of divergencias) {
      await this.inventory.move(
        context,
        {
          branchId: order.branchId,
          warehouseId,
          productId: linha.productId,
          quantity: linha.quantityReceived,
          sourceId: order.id,
          destinationId: null,
          document: xmlAccessKey,
          reason: `Recebimento do pedido de compra ${order.id}`,
          idempotencyKey: `receiving:${receivingId}:${linha.productId}`,
          allowNegative: false,
        },
        'INBOUND',
        linha.quantityReceived,
      );
      await this.updateProductCost(context, order.branchId, warehouseId, linha);
    }

    const totalCostCentavos = divergencias.reduce(
      (sum, linha) => sum + linha.quantityReceived * linha.unitCostReceived,
      0,
    );

    const titulo = await this.titulos.criar({
      tenantId: context.tenantId as never,
      branchId: order.branchId,
      tipo: 'PAGAR',
      descricao: `Recebimento do pedido de compra ${order.id}`,
      fornecedorId: order.supplierId,
      customerId: null,
      orderId: null,
      valorOriginalCentavos: totalCostCentavos,
      vencimento: this.addDays(now, DEFAULT_PAYMENT_TERM_DAYS),
      criadoPor: context.userId as never,
      now,
    });

    const receiving: Receiving = {
      id: receivingId,
      tenantId: context.tenantId as Receiving['tenantId'],
      branchId: order.branchId,
      warehouseId,
      purchaseOrderId: order.id,
      supplierId: order.supplierId,
      source,
      xmlAccessKey,
      lines: divergencias,
      totalCostCentavos,
      tituloId: titulo.id,
      receivedAt: now,
      receivedBy: context.userId as Receiving['receivedBy'],
    };
    await this.receivings.create(context.tenantId, receiving);

    const updatedOrder = registrarRecebimento(order, divergencias);
    await this.purchaseOrders.update(context.tenantId, updatedOrder, order.version);

    return receiving;
  }

  private async updateProductCost(
    context: TenantContext,
    branchId: string,
    warehouseId: string,
    linha: { productId: string; quantityReceived: number; unitCostReceived: number },
  ): Promise<void> {
    const target = this.findProductById(context, linha.productId);
    if (!target) return;

    const balanceBefore = await this.receivings.getBalance(
      context.tenantId,
      branchId,
      warehouseId,
      linha.productId,
    );
    const newAverageCost = custoMedioApos(
      balanceBefore?.available ?? 0,
      target.pricing.averageCost,
      linha.quantityReceived,
      linha.unitCostReceived,
    );

    this.products.update(context, linha.productId, {
      pricing: {
        cost: newAverageCost,
        averageCost: newAverageCost,
        lastCost: linha.unitCostReceived,
        salePrice: target.pricing.salePrice,
        promotionalPrice: target.pricing.promotionalPrice,
        marginPercent: computeMarginPercent(newAverageCost, target.pricing.salePrice),
      },
    });
  }

  private findProductById(context: TenantContext, productId: string): Product | undefined {
    // MAX_PAGE_LIMIT paginado seria mais correto para catalogos gigantes,
    // mas ProductService ainda nao expoe findById — extensao para quando o
    // volume exigir (o mesmo limite ja documentado em ProductRepository).
    let cursor: string | undefined;
    for (let guard = 0; guard < 50; guard += 1) {
      const page = this.products.search(context, {}, 200, cursor);
      const found = page.items.find((item) => item.id === productId);
      if (found) return found;
      if (!page.hasMore || !page.nextCursor) return undefined;
      cursor = page.nextCursor;
    }
    return undefined;
  }

  private async getOrder(context: TenantContext, orderId: string): Promise<PurchaseOrder> {
    const order = await this.purchaseOrders.findById(context.tenantId, orderId);
    if (!order) throw new BadRequestException('Pedido de compra não encontrado');
    return order;
  }

  private onlyDigits(value: string): string {
    return value.replace(/\D/g, '');
  }

  private addDays(iso: string, days: number): string {
    const date = new Date(iso);
    date.setUTCDate(date.getUTCDate() + days);
    return date.toISOString();
  }
}
