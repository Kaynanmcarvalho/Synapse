import { BadRequestException, ForbiddenException, Injectable } from '@nestjs/common';
import type { StockBalance, StockMovement, StockMovementKind } from '@synapse/types';
import { randomUUID } from 'node:crypto';
import type { TenantContext } from '../../iam/iam.types';
import type { StockCommand } from '../dto/inventory.schemas';
import { InventoryRepository } from '../repositories/inventory.repository';

@Injectable()
export class InventoryService {
  constructor(private readonly repository: InventoryRepository) {}
  reserve(context: TenantContext, input: StockCommand) {
    return this.change(context, input, 'RESERVE', (stock) => ({
      physical: stock.physical,
      reserved: stock.reserved + input.quantity,
      blocked: stock.blocked,
    }));
  }
  fulfill(context: TenantContext, input: StockCommand) {
    return this.change(context, input, 'SALE', (stock) => {
      if (stock.reserved < input.quantity)
        throw new BadRequestException('Quantidade faturada excede a reserva');
      return {
        physical: stock.physical - input.quantity,
        reserved: stock.reserved - input.quantity,
        blocked: stock.blocked,
      };
    });
  }
  release(context: TenantContext, input: StockCommand) {
    return this.change(context, input, 'RELEASE', (stock) => {
      if (stock.reserved < input.quantity)
        throw new BadRequestException('Quantidade cancelada excede a reserva');
      return {
        physical: stock.physical,
        reserved: stock.reserved - input.quantity,
        blocked: stock.blocked,
      };
    });
  }
  move(
    context: TenantContext,
    input: StockCommand,
    kind: StockMovementKind,
    physicalDelta: number,
  ) {
    return this.change(context, input, kind, (stock) => ({
      physical: stock.physical + physicalDelta,
      reserved: stock.reserved,
      blocked: stock.blocked,
    }));
  }
  transferOut(context: TenantContext, input: StockCommand) {
    return this.change(context, input, 'TRANSFER', (stock) => ({
      physical: stock.physical - input.quantity,
      reserved: stock.reserved,
      blocked: stock.blocked,
      inTransit: stock.inTransit + input.quantity,
    }));
  }
  transferReceive(context: TenantContext, input: StockCommand, destination: boolean) {
    return this.change(context, input, 'TRANSFER', (stock) => ({
      physical: stock.physical + (destination ? input.quantity : 0),
      reserved: stock.reserved,
      blocked: stock.blocked,
      inTransit: destination ? stock.inTransit : stock.inTransit - input.quantity,
    }));
  }
  private change(
    context: TenantContext,
    input: StockCommand,
    kind: StockMovementKind,
    mutate: (
      stock: StockBalance,
    ) => Pick<StockBalance, 'physical' | 'reserved' | 'blocked'> &
      Partial<Pick<StockBalance, 'inTransit' | 'damaged' | 'consigned'>>,
  ) {
    const key = `${input.branchId}_${input.warehouseId}_${input.productId}`;
    const initial: StockBalance = {
      tenantId: context.tenantId as StockBalance['tenantId'],
      branchId: input.branchId as StockBalance['branchId'],
      warehouseId: input.warehouseId,
      productId: input.productId as StockBalance['productId'],
      physical: 0,
      reserved: 0,
      blocked: 0,
      available: 0,
      inTransit: 0,
      damaged: 0,
      consigned: 0,
      version: 0,
    };
    return this.repository.transact(context.tenantId, key, initial, (before) => {
      const values = mutate(before);
      const available = values.physical - values.reserved - values.blocked;
      if (available < 0 && !input.allowNegative)
        throw new BadRequestException('Saldo disponível insuficiente');
      if (available < 0 && !context.roleIds.includes('inventory.allow_negative'))
        throw new ForbiddenException('Permissão inventory.allow_negative obrigatória');
      const after: StockBalance = { ...before, ...values, available, version: before.version + 1 };
      const movement: StockMovement = {
        id: randomUUID(),
        tenantId: before.tenantId,
        branchId: before.branchId,
        warehouseId: before.warehouseId,
        productId: before.productId,
        kind,
        quantity: input.quantity,
        before,
        after,
        sourceId: input.sourceId,
        destinationId: input.destinationId ?? null,
        document: input.document ?? null,
        reason: input.reason,
        userId: context.userId,
        occurredAt: new Date().toISOString(),
        idempotencyKey: input.idempotencyKey,
      };
      return { balance: after, movement };
    });
  }
}
