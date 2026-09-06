import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import type { StockTransfer, TransferStatus } from '@synapse/types';
import { randomUUID } from 'node:crypto';
import type { TenantContext } from '../../iam/iam.types';
import { InventoryService } from './inventory.service';

@Injectable()
export class TransferService {
  private readonly transfers = new Map<string, StockTransfer>();
  constructor(private readonly inventory: InventoryService) {}
  create(
    context: TenantContext,
    input: Omit<StockTransfer, 'id' | 'tenantId' | 'status' | 'history'>,
  ) {
    return this.save({
      ...input,
      id: randomUUID(),
      tenantId: context.tenantId as StockTransfer['tenantId'],
      status: 'PENDING',
      history: [this.event('PENDING', context.userId, 'Solicitação criada')],
    });
  }
  approve(context: TenantContext, id: string) {
    if (!context.roleIds.includes('inventory.transfer.approve'))
      throw new ForbiddenException('Permissão de aprovação obrigatória');
    return this.transition(id, 'APPROVED', context.userId, 'Transferência aprovada');
  }
  startPicking(context: TenantContext, id: string) {
    return this.transition(id, 'PICKING', context.userId, 'Separação iniciada');
  }
  async ship(context: TenantContext, id: string, shipped: readonly number[]) {
    const transfer = this.get(id);
    if (transfer.status !== 'PICKING')
      throw new BadRequestException('Transferência não está em separação');
    const items = transfer.items.map((item, index) => ({ ...item, shipped: shipped[index] ?? 0 }));
    await Promise.all(
      items.map((item, index) =>
        this.inventory.transferOut(context, {
          branchId: transfer.originBranchId,
          warehouseId: transfer.originWarehouseId,
          productId: item.productId,
          quantity: item.shipped,
          sourceId: transfer.id,
          destinationId: transfer.destinationWarehouseId,
          document: transfer.id,
          reason: 'Saída para transferência',
          idempotencyKey: `${transfer.id}:ship:${index}`,
          allowNegative: false,
        }),
      ),
    );
    return this.save({
      ...transfer,
      items,
      status: 'IN_TRANSIT',
      history: [
        ...transfer.history,
        this.event('IN_TRANSIT', context.userId, 'Baixa na origem e entrada em trânsito'),
      ],
    });
  }
  async receive(context: TenantContext, id: string, received: readonly number[]) {
    const transfer = this.get(id);
    if (transfer.status !== 'IN_TRANSIT')
      throw new BadRequestException('Transferência não está em trânsito');
    const items = transfer.items.map((item, index) => ({
      ...item,
      received: received[index] ?? 0,
    }));
    const divergent = items.some((item) => item.received !== item.shipped);
    const status: TransferStatus = divergent ? 'DIVERGENCE' : 'RECEIVED';
    if (!divergent)
      await Promise.all(
        items.flatMap((item, index) => [
          this.inventory.transferReceive(
            context,
            {
              branchId: transfer.originBranchId,
              warehouseId: transfer.originWarehouseId,
              productId: item.productId,
              quantity: item.received,
              sourceId: transfer.id,
              destinationId: transfer.destinationWarehouseId,
              document: transfer.id,
              reason: 'Baixa do estoque em trânsito',
              idempotencyKey: `${transfer.id}:transit:${index}`,
              allowNegative: false,
            },
            false,
          ),
          this.inventory.transferReceive(
            context,
            {
              branchId: transfer.destinationBranchId,
              warehouseId: transfer.destinationWarehouseId,
              productId: item.productId,
              quantity: item.received,
              sourceId: transfer.originWarehouseId,
              destinationId: transfer.destinationWarehouseId,
              document: transfer.id,
              reason: 'Entrada de transferência conferida',
              idempotencyKey: `${transfer.id}:receive:${index}`,
              allowNegative: false,
            },
            true,
          ),
        ]),
      );
    return this.save({
      ...transfer,
      items,
      status,
      history: [
        ...transfer.history,
        this.event(
          status,
          context.userId,
          divergent
            ? 'Conferência divergente; entrada bloqueada'
            : 'Conferência item a item concluída; entrada liberada',
        ),
      ],
    });
  }
  private transition(id: string, status: TransferStatus, userId: string, note: string) {
    const transfer = this.get(id);
    return this.save({
      ...transfer,
      status,
      history: [...transfer.history, this.event(status, userId, note)],
    });
  }
  private event(status: TransferStatus, userId: string, note: string) {
    return { status, userId, occurredAt: new Date().toISOString(), note };
  }
  private save(value: StockTransfer) {
    this.transfers.set(value.id, value);
    return value;
  }
  private get(id: string) {
    const value = this.transfers.get(id);
    if (!value) throw new NotFoundException('Transferência não encontrada');
    return value;
  }
}
