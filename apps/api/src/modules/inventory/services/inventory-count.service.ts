import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import type {
  InventoryCount,
  InventoryCountLine,
  InventoryCountType,
  InventoryMovementPolicy,
} from '@synapse/types';
import { randomUUID } from 'node:crypto';
import type { TenantContext } from '../../iam/iam.types';
import { InventoryCountLockService } from './inventory-count-lock.service';
import { InventoryService } from './inventory.service';

interface OpenInventoryInput {
  readonly branchId: string;
  readonly warehouseId: string;
  readonly type: InventoryCountType;
  readonly movementPolicy: InventoryMovementPolicy;
  readonly categoryId?: string | null;
  readonly items: readonly {
    productId: string;
    barcode: string;
    name: string;
    systemQuantity: number;
    unitCost: number;
  }[];
}

@Injectable()
export class InventoryCountService {
  private readonly counts = new Map<string, InventoryCount>();

  constructor(
    private readonly inventory: InventoryService,
    private readonly locks: InventoryCountLockService,
  ) {}

  open(context: TenantContext, input: OpenInventoryInput): InventoryCount {
    if (input.items.length === 0) throw new BadRequestException('Inventário sem produtos');
    if (input.type === 'CATEGORY' && !input.categoryId)
      throw new BadRequestException('Categoria obrigatória para este tipo de inventário');

    const id = randomUUID();
    this.locks.open({
      id,
      tenantId: context.tenantId,
      branchId: input.branchId,
      warehouseId: input.warehouseId,
      policy: input.movementPolicy,
    });
    const count: InventoryCount = {
      id,
      tenantId: context.tenantId as InventoryCount['tenantId'],
      branchId: input.branchId as InventoryCount['branchId'],
      warehouseId: input.warehouseId,
      type: input.type,
      movementPolicy: input.movementPolicy,
      status: 'COUNTING',
      categoryId: input.categoryId ?? null,
      responsibleId: context.userId,
      startedAt: new Date().toISOString(),
      reviewedAt: null,
      adjustedAt: null,
      lines: input.items.map((item) => ({
        ...item,
        productId: item.productId as InventoryCountLine['productId'],
        countedQuantity: null,
        difference: 0,
        differenceCost: 0,
        counterId: null,
        countedAt: null,
      })),
    };
    this.counts.set(id, count);
    return count;
  }

  get(context: TenantContext, id: string) {
    const count = this.require(context, id);
    return {
      ...count,
      summary: this.summary(count),
    };
  }

  scan(context: TenantContext, id: string, barcode: string, quantity = 1) {
    if (quantity <= 0 || !Number.isInteger(quantity))
      throw new BadRequestException('Quantidade deve ser um inteiro positivo');
    const count = this.require(context, id);
    if (count.status !== 'COUNTING')
      throw new BadRequestException('Inventário não está em contagem');
    const index = count.lines.findIndex((line) => line.barcode === barcode);
    if (index < 0) throw new NotFoundException('Código de barras fora do escopo do inventário');
    const current = count.lines[index];
    if (!current) throw new NotFoundException('Produto fora do escopo do inventário');
    const countedQuantity = (current.countedQuantity ?? 0) + quantity;
    const line: InventoryCountLine = {
      ...current,
      countedQuantity,
      difference: countedQuantity - current.systemQuantity,
      differenceCost: (countedQuantity - current.systemQuantity) * current.unitCost,
      counterId: context.userId,
      countedAt: new Date().toISOString(),
    };
    const lines = [...count.lines];
    lines[index] = line;
    const updated = { ...count, lines };
    this.counts.set(id, updated);
    return { line, summary: this.summary(updated) };
  }

  review(context: TenantContext, id: string) {
    const count = this.require(context, id);
    if (count.status !== 'COUNTING')
      throw new BadRequestException('Inventário não está em contagem');
    if (count.lines.some((line) => line.countedQuantity === null))
      throw new BadRequestException('Todos os itens precisam ser contados');
    const updated: InventoryCount = {
      ...count,
      status: 'REVIEW',
      reviewedAt: new Date().toISOString(),
    };
    this.counts.set(id, updated);
    return { ...updated, summary: this.summary(updated) };
  }

  async adjust(context: TenantContext, id: string) {
    const count = this.require(context, id);
    if (count.status !== 'REVIEW')
      throw new BadRequestException('Inventário precisa estar em revisão');
    for (const line of count.lines) {
      if (line.difference === 0) continue;
      await this.inventory.move(
        context,
        {
          branchId: count.branchId,
          warehouseId: count.warehouseId,
          productId: line.productId,
          quantity: Math.abs(line.difference),
          sourceId: count.id,
          destinationId: null,
          document: `INVENTARIO-${count.id}`,
          reason: `Ajuste do inventário contado por ${line.counterId ?? count.responsibleId}`,
          idempotencyKey: `${count.id}-${line.productId}`,
          allowNegative: false,
        },
        'ADJUSTMENT',
        line.difference,
      );
    }
    const updated: InventoryCount = {
      ...count,
      status: 'ADJUSTED',
      adjustedAt: new Date().toISOString(),
    };
    this.counts.set(id, updated);
    this.locks.close(context.tenantId, count.branchId, count.warehouseId, count.id);
    return { ...updated, summary: this.summary(updated) };
  }

  divergenceReport(context: TenantContext, id: string) {
    const count = this.require(context, id);
    const byResponsible = new Map<
      string,
      { items: number; netQuantity: number; netCost: number }
    >();
    for (const line of count.lines.filter((item) => item.difference !== 0)) {
      const responsibleId = line.counterId ?? count.responsibleId;
      const current = byResponsible.get(responsibleId) ?? { items: 0, netQuantity: 0, netCost: 0 };
      byResponsible.set(responsibleId, {
        items: current.items + 1,
        netQuantity: current.netQuantity + line.difference,
        netCost: current.netCost + line.differenceCost,
      });
    }
    return {
      inventoryId: id,
      totals: this.summary(count),
      byResponsible: [...byResponsible].map(([responsibleId, totals]) => ({
        responsibleId,
        ...totals,
      })),
    };
  }

  private require(context: TenantContext, id: string) {
    const count = this.counts.get(id);
    if (!count || count.tenantId !== context.tenantId)
      throw new NotFoundException('Inventário não encontrado');
    return count;
  }

  private summary(count: InventoryCount) {
    const counted = count.lines.filter((line) => line.countedQuantity !== null).length;
    const divergent = count.lines.filter((line) => line.difference !== 0).length;
    return {
      total: count.lines.length,
      counted,
      pending: count.lines.length - counted,
      divergent,
      differenceQuantity: count.lines.reduce((sum, line) => sum + line.difference, 0),
      differenceCost: count.lines.reduce((sum, line) => sum + line.differenceCost, 0),
    };
  }
}
