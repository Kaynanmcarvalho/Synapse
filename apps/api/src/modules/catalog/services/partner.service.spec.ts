import { BadRequestException } from '@nestjs/common';
import { PartnerRepository } from '../repositories/partner.repository';
import { PartnerService } from './partner.service';

const context = {
  tenantId: 'tenant',
  userId: 'user',
  roleIds: [],
  branchIds: [],
  warehouseIds: [],
};
const input = {
  type: 'PF' as const,
  taxId: '52998224725',
  stateRegistration: null,
  municipalRegistration: null,
  name: 'Maria Silva',
  legalName: null,
  address: {
    street: 'Rua A',
    number: '1',
    complement: null,
    district: 'Centro',
    city: 'Goiânia',
    state: 'GO',
    postalCode: '74000000',
  },
  phone: '62999999999',
  whatsapp: null,
  email: null,
  creditLimit: 10_000,
  responsibleSellerId: 'seller',
  priceTableId: 'table',
  paymentTermId: '30d',
  active: true,
};
describe('PartnerService', () => {
  it('cadastra, busca e consolida histórico', () => {
    const service = new PartnerService(new PartnerRepository());
    const customer = service.createCustomer(context, input);
    expect(service.searchCustomers('tenant', '529.982').items).toHaveLength(1);
    service.addHistory(customer.id, {
      kind: 'ORDER',
      referenceId: 'order',
      amount: 500,
      occurredAt: new Date().toISOString(),
      description: 'Pedido',
    });
    expect(service.history(customer.id).items).toHaveLength(1);
  });
  it('bloqueia venda acima do crédito', () => {
    const service = new PartnerService(new PartnerRepository());
    const customer = service.createCustomer(context, input);
    expect(() => service.assertCredit('tenant', customer.id, 10_001)).toThrow(BadRequestException);
  });
  it('bloqueia venda de cliente inadimplente', () => {
    const service = new PartnerService(new PartnerRepository());
    const customer = service.createCustomer(context, input);
    service.setFinancialStatus('tenant', customer.id, 'OVERDUE');
    expect(() => service.assertCredit('tenant', customer.id, 1)).toThrow(
      'Cliente bloqueado por inadimplência',
    );
  });
});
