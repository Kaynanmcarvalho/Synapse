import { ConflictException, Injectable } from '@nestjs/common';
import type { InventoryMovementPolicy, StockMovementKind } from '@synapse/types';

interface ActiveCount {
  readonly id: string;
  readonly tenantId: string;
  readonly branchId: string;
  readonly warehouseId: string;
  readonly policy: InventoryMovementPolicy;
}

@Injectable()
export class InventoryCountLockService {
  private readonly active = new Map<string, ActiveCount>();

  open(count: ActiveCount) {
    const key = this.key(count.tenantId, count.branchId, count.warehouseId);
    const current = this.active.get(key);
    if (current) throw new ConflictException('Já existe um inventário ativo neste depósito');
    this.active.set(key, count);
  }

  close(tenantId: string, branchId: string, warehouseId: string, countId: string) {
    const key = this.key(tenantId, branchId, warehouseId);
    if (this.active.get(key)?.id === countId) this.active.delete(key);
  }

  assertMovementAllowed(
    tenantId: string,
    branchId: string,
    warehouseId: string,
    kind: StockMovementKind,
    sourceId: string,
  ) {
    const count = this.active.get(this.key(tenantId, branchId, warehouseId));
    if (!count || count.policy === 'SNAPSHOT') return;
    if (kind === 'ADJUSTMENT' && sourceId === count.id) return;
    throw new ConflictException(
      `Movimentações congeladas pelo inventário ${count.id}. Finalize ou cancele a contagem.`,
    );
  }

  private key(tenantId: string, branchId: string, warehouseId: string) {
    return `${tenantId}:${branchId}:${warehouseId}`;
  }
}
