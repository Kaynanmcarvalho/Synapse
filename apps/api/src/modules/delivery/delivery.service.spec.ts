import type { UserId } from '@synapse/types';
import type { InventoryService } from '../inventory/services/inventory.service';
import { DeliveryRepository } from './delivery.repository';
import { DeliveryService } from './delivery.service';
const tenant = {
  tenantId: 'tenant',
  userId: 'user' as UserId,
  roleIds: [],
  branchIds: ['branch'],
  warehouseIds: ['warehouse'],
};
describe('DeliveryService', () => {
  it('percorre os seis status, exige comprovante e devolve falha ao estoque', async () => {
    const inventory = { move: jest.fn().mockResolvedValue({}) } as unknown as InventoryService;
    const service = new DeliveryService(new DeliveryRepository(), inventory);
    const route = service.create(tenant, {
      name: 'Rota Sul',
      branchId: 'branch',
      warehouseId: 'warehouse',
      ownFleet: true,
      mdfeId: 'mdfe-1',
      deliveries: [
        {
          orderId: 'order-1',
          address: 'Fazenda Boa Vista',
          items: [{ productId: 'product-1', quantity: 1000 }],
        },
      ],
    });
    const delivery = route.deliveries[0];
    if (!delivery) throw new Error('Entrega não criada');
    expect(delivery.status).toBe('AGUARDANDO');
    expect(
      service.assign(tenant, route.id, { driverId: 'driver', vehicleId: 'vehicle' }).driverId,
    ).toBe('driver');
    expect(service.startPicking(tenant, route.id, delivery.id).deliveries[0]?.status).toBe(
      'SEPARANDO',
    );
    expect(
      service.pick(tenant, route.id, delivery.id, { checkedProductIds: ['product-1'] })
        .deliveries[0]?.status,
    ).toBe('PRONTO');
    expect(service.dispatch(tenant, route.id).deliveries[0]?.status).toBe('EM_ROTA');
    expect(() =>
      service.deliver(tenant, route.id, delivery.id, { signatureUrl: null, photoUrl: null }),
    ).toThrow(/foto obrigatória/);
    await service.fail(tenant, route.id, delivery.id, {
      reason: 'Cliente ausente no endereço informado',
      disposition: 'RETURN_STOCK',
    });
    expect(inventory.move).toHaveBeenCalledWith(
      tenant,
      expect.objectContaining({ productId: 'product-1' }),
      'RETURN',
      1000,
    );
    expect(service.list(tenant).items[0]?.deliveries[0]?.status).toBe('NAO_ENTREGUE');
  });
  it('registra entrega com assinatura ou foto', () => {
    const service = new DeliveryService(new DeliveryRepository(), {} as InventoryService);
    let route = service.create(tenant, {
      name: 'Rota Norte',
      branchId: 'branch',
      warehouseId: 'warehouse',
      ownFleet: false,
      deliveries: [
        { orderId: 'order', address: 'Rua principal 10', items: [{ productId: 'p', quantity: 1 }] },
      ],
    });
    const first = route.deliveries[0];
    if (!first) throw new Error('Entrega não criada');
    const id = first.id;
    service.assign(tenant, route.id, { driverId: 'd', vehicleId: 'v' });
    service.startPicking(tenant, route.id, id);
    service.pick(tenant, route.id, id, { checkedProductIds: ['p'] });
    service.dispatch(tenant, route.id);
    route = service.deliver(tenant, route.id, id, { photoUrl: 'https://storage/proof.jpg' });
    expect(route.deliveries[0]?.status).toBe('ENTREGUE');
  });
});
