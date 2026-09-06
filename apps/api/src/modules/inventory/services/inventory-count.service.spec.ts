import type { InventoryService } from './inventory.service';
import { InventoryCountLockService } from './inventory-count-lock.service';
import { InventoryCountService } from './inventory-count.service';

const context = {
  tenantId: 'tenant',
  userId: 'conferente-1',
  roleIds: [],
  branchIds: ['goiania'],
  warehouseIds: ['central'],
};
const input = {
  branchId: 'goiania',
  warehouseId: 'central',
  type: 'GENERAL' as const,
  movementPolicy: 'FREEZE' as const,
  items: [
    {
      productId: 'milho',
      barcode: '789100000001',
      name: 'Milho 20 kg',
      systemQuantity: 10,
      unitCost: 80,
    },
    {
      productId: 'soja',
      barcode: '789100000002',
      name: 'Soja 20 kg',
      systemQuantity: 5,
      unitCost: 120,
    },
  ],
};

describe('InventoryCountService', () => {
  it('abre os cinco tipos de inventário', () => {
    for (const type of ['GENERAL', 'PARTIAL', 'CATEGORY', 'WAREHOUSE', 'CYCLE'] as const) {
      const service = new InventoryCountService(
        {} as InventoryService,
        new InventoryCountLockService(),
      );
      const count = service.open(context, {
        ...input,
        type,
        categoryId: type === 'CATEGORY' ? 'sementes' : null,
      });
      expect(count).toMatchObject({ type, status: 'COUNTING', responsibleId: 'conferente-1' });
    }
  });

  it('lê por código de barras e calcula quantidade e custo da divergência', () => {
    const service = new InventoryCountService(
      {} as InventoryService,
      new InventoryCountLockService(),
    );
    const count = service.open(context, input);
    service.scan(context, count.id, '789100000001', 8);
    service.scan(context, count.id, '789100000002', 6);
    const report = service.divergenceReport(context, count.id);
    expect(report.totals).toMatchObject({
      divergent: 2,
      differenceQuantity: -1,
      differenceCost: -40,
    });
    expect(report.byResponsible).toEqual([
      { responsibleId: 'conferente-1', items: 2, netQuantity: -1, netCost: -40 },
    ]);
  });

  it('gera um movimento auditável por item divergente ao ajustar', async () => {
    const move = jest.fn().mockResolvedValue({});
    const service = new InventoryCountService(
      { move } as unknown as InventoryService,
      new InventoryCountLockService(),
    );
    const count = service.open(context, input);
    service.scan(context, count.id, '789100000001', 9);
    service.scan(context, count.id, '789100000002', 5);
    service.review(context, count.id);
    const adjusted = await service.adjust(context, count.id);
    expect(adjusted.status).toBe('ADJUSTED');
    expect(move).toHaveBeenCalledTimes(1);
    expect(move).toHaveBeenCalledWith(
      context,
      expect.objectContaining({
        productId: 'milho',
        quantity: 1,
        sourceId: count.id,
        reason: expect.stringContaining('conferente-1'),
      }),
      'ADJUSTMENT',
      -1,
    );
  });

  it('congela movimentos externos enquanto a contagem estiver ativa', () => {
    const locks = new InventoryCountLockService();
    const service = new InventoryCountService({} as InventoryService, locks);
    const count = service.open(context, input);
    expect(() =>
      locks.assertMovementAllowed('tenant', 'goiania', 'central', 'SALE', 'pedido-1'),
    ).toThrow(/congeladas/);
    expect(() =>
      locks.assertMovementAllowed('tenant', 'goiania', 'central', 'ADJUSTMENT', count.id),
    ).not.toThrow();
  });
});
