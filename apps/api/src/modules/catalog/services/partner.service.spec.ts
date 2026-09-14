import type { Firestore } from '@synapse/firebase/admin';
import { FakeFirestore } from '../../../../test/fake-firestore';
import { FornecedorRepository } from '../repositories/fornecedor.repository';
import { PartnerRepository } from '../repositories/partner.repository';
import { PartnerService } from './partner.service';

const context = {
  tenantId: 'tenant',
  userId: 'user',
  roleIds: [],
  branchIds: [],
  warehouseIds: [],
};

const fornecedor = {
  taxId: '11222333000181',
  stateRegistration: '101234567',
  legalName: 'Distribuidora Norte LTDA',
  tradeName: 'Norte',
  contacts: [{ name: 'Ana', phone: '6233330000', email: null }],
  paymentTermId: null,
  averageLeadDays: 5,
  averagePrice: 1000,
  productIds: [],
  active: true,
};

describe('PartnerService', () => {
  it('cadastra e acha fornecedor', async () => {
    const service = new PartnerService(
      new PartnerRepository(),
      new FornecedorRepository(new FakeFirestore() as unknown as Firestore),
    );
    const criado = await service.createSupplier(context, fornecedor);
    expect((await service.searchSuppliers('tenant', 'norte')).items).toHaveLength(1);
    expect((await service.getSupplier('tenant', criado.id)).tradeName).toBe('Norte');
    expect(criado.codigo).toBe(1);
  });

  it('historico de atendimento guarda o que foi registrado', () => {
    const service = new PartnerService(
      new PartnerRepository(),
      new FornecedorRepository(new FakeFirestore() as unknown as Firestore),
    );
    service.addHistory('cliente-1', {
      kind: 'ORDER',
      referenceId: 'order',
      amount: 500,
      occurredAt: new Date().toISOString(),
      description: 'Pedido',
    });
    expect(service.history('cliente-1').items).toHaveLength(1);
  });
});
