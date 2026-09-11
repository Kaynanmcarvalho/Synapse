import type { PurchaseOrder } from '@synapse/types';
import type { TenantContext } from '../../iam/iam.types';
import type { PurchaseOrderRepository } from '../repositories/purchase-order.repository';
import { PurchaseOrderService } from './purchase-order.service';

const tenant: TenantContext = {
  tenantId: 'tenant-1',
  userId: 'user-1',
  roleIds: [],
  branchIds: [],
  warehouseIds: [],
};

class FakeRepository {
  orders = new Map<string, PurchaseOrder>();
  async create(_tenantId: string, order: PurchaseOrder) {
    this.orders.set(order.id, order);
    return order;
  }
  async findById(_tenantId: string, id: string) {
    return this.orders.get(id) ?? null;
  }
  async update(_tenantId: string, order: PurchaseOrder, expectedVersion: number) {
    const current = this.orders.get(order.id);
    if (!current || current.version !== expectedVersion) throw new Error('CONFLICT');
    this.orders.set(order.id, order);
    return order;
  }
  async list(_tenantId: string, branchId: string) {
    return [...this.orders.values()].filter((order) => order.branchId === branchId);
  }
  async listReceivedFromSupplier(_tenantId: string, supplierId: string) {
    return [...this.orders.values()].filter(
      (order) => order.supplierId === supplierId && order.status === 'RECEBIDO',
    );
  }
}

function buildService() {
  const repository = new FakeRepository();
  const service = new PurchaseOrderService(repository as unknown as PurchaseOrderRepository);
  return { service, repository };
}

describe('PurchaseOrderService', () => {
  it('cria um pedido e persiste via repositório', async () => {
    const { service } = buildService();
    const order = await service.create(tenant, {
      branchId: 'matriz',
      warehouseId: 'wh1',
      items: [{ productId: 'produto-a', quantityOrdered: 10 }],
      sourceSuggestionIds: ['matriz_produto-a'],
    });
    expect(order.status).toBe('RASCUNHO');
    expect(order.sourceSuggestionIds).toEqual(['matriz_produto-a']);
  });

  it('adiciona cotação e depois aprova com a vencedora, incrementando a versão a cada passo', async () => {
    const { service } = buildService();
    let order = await service.create(tenant, {
      branchId: 'matriz',
      warehouseId: 'wh1',
      items: [{ productId: 'produto-a', quantityOrdered: 10 }],
      sourceSuggestionIds: [],
    });
    expect(order.version).toBe(1);

    order = await service.addQuote(tenant, order.id, {
      supplierId: 'fornecedor-1',
      leadDays: 5,
      items: [{ productId: 'produto-a', unitCostCentavos: 1000 }],
    });
    expect(order.version).toBe(2);

    order = await service.addQuote(tenant, order.id, {
      supplierId: 'fornecedor-2',
      leadDays: 7,
      items: [{ productId: 'produto-a', unitCostCentavos: 900 }],
    });
    expect(order.version).toBe(3);

    order = await service.selectSupplier(tenant, order.id, { supplierId: 'fornecedor-2' });
    expect(order.status).toBe('APROVADO');
    expect(order.version).toBe(4);
  });

  it('propaga o erro de negócio quando a aprovação não tem duas cotações', async () => {
    const { service } = buildService();
    let order = await service.create(tenant, {
      branchId: 'matriz',
      warehouseId: 'wh1',
      items: [{ productId: 'produto-a', quantityOrdered: 10 }],
      sourceSuggestionIds: [],
    });
    order = await service.addQuote(tenant, order.id, {
      supplierId: 'fornecedor-1',
      leadDays: 5,
      items: [{ productId: 'produto-a', unitCostCentavos: 1000 }],
    });

    await expect(
      service.selectSupplier(tenant, order.id, { supplierId: 'fornecedor-1' }),
    ).rejects.toThrow('É preciso comparar ao menos duas cotações');
  });

  it('lança NotFoundException para um pedido inexistente', async () => {
    const { service } = buildService();
    await expect(service.get(tenant, 'nao-existe')).rejects.toThrow('não encontrado');
  });
});
