import type { StockBalance } from '@synapse/types';
import type { InventoryRepository } from '../repositories/inventory.repository';
import { InventoryService } from './inventory.service';

const context = {
  tenantId: 'tenant',
  userId: 'user',
  roleIds: [],
  branchIds: ['branch'],
  warehouseIds: ['warehouse'],
};
const command = {
  branchId: 'branch',
  warehouseId: 'warehouse',
  productId: 'product',
  quantity: 1_000,
  sourceId: 'order',
  destinationId: null,
  document: null,
  reason: 'Reserva do pedido',
  idempotencyKey: 'reserve-order',
  allowNegative: false,
};
const initial = {
  tenantId: 'tenant',
  branchId: 'branch',
  warehouseId: 'warehouse',
  productId: 'product',
  physical: 1_000,
  reserved: 0,
  blocked: 0,
  available: 1_000,
  inTransit: 0,
  damaged: 0,
  consigned: 0,
  version: 1,
} as StockBalance;

class AtomicRepository {
  balance = initial;
  private queue = Promise.resolve();
  transact(
    _tenant: string,
    _key: string,
    _initial: StockBalance,
    operation: Parameters<InventoryRepository['transact']>[3],
  ): Promise<StockBalance> {
    const run = this.queue.then(() => {
      const result = operation(this.balance);
      this.balance = result.balance;
      return this.balance;
    });
    this.queue = run.then(
      () => undefined,
      () => undefined,
    );
    return run;
  }
}

describe('InventoryService', () => {
  it('permite apenas um dos pedidos disputando a última unidade', async () => {
    const repository = new AtomicRepository();
    const service = new InventoryService(repository as unknown as InventoryRepository);
    const results = await Promise.allSettled([
      service.reserve(context, command),
      service.reserve(context, { ...command, idempotencyKey: 'reserve-order-2' }),
    ]);
    expect(results.filter((result) => result.status === 'fulfilled')).toHaveLength(1);
    expect(results.filter((result) => result.status === 'rejected')).toHaveLength(1);
  });
  it('cancelar devolve exatamente a quantidade reservada', async () => {
    const repository = new AtomicRepository();
    const service = new InventoryService(repository as unknown as InventoryRepository);
    await service.reserve(context, command);
    const released = await service.release(context, command);
    expect(released).toMatchObject({ physical: 1_000, reserved: 0, available: 1_000 });
  });
});
