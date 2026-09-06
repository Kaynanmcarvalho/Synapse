import { TransferService } from './transfer.service';
import type { InventoryService } from './inventory.service';

const approver = {
  tenantId: 't',
  userId: 'u',
  roleIds: ['inventory.transfer.approve'],
  branchIds: [],
  warehouseIds: [],
};
describe('TransferService', () => {
  it('mantém lote/validade, trânsito e só recebe após conferência exata', async () => {
    const inventory = {
      transferOut: async () => ({}),
      transferReceive: async () => ({}),
    } as unknown as InventoryService;
    const service = new TransferService(inventory);
    const created = service.create(approver, {
      originBranchId: 'a',
      originWarehouseId: 'wa',
      destinationBranchId: 'b',
      destinationWarehouseId: 'wb',
      items: [
        {
          productId: 'p',
          lotId: 'lot',
          expiresOn: '2027-01-01',
          requested: 1_000,
          shipped: 0,
          received: 0,
        },
      ],
    } as never);
    service.approve(approver, created.id);
    service.startPicking(approver, created.id);
    const shipped = await service.ship(approver, created.id, [1_000]);
    expect(shipped.status).toBe('IN_TRANSIT');
    expect((await service.receive(approver, created.id, [900])).status).toBe('DIVERGENCE');
    expect(shipped.items[0]).toMatchObject({ lotId: 'lot', expiresOn: '2027-01-01' });
  });
});
