import type { Firestore } from '@synapse/firebase/admin';
import { FakeFirestore } from '../../../../test/fake-firestore';
import { FornecedorRepository } from '../../catalog/repositories/fornecedor.repository';
import type { Customer } from '@synapse/types';
import { PartnerRepository } from '../../catalog/repositories/partner.repository';
import type { ClienteService } from '../../catalog/services/cliente.service';
import { PartnerService } from '../../catalog/services/partner.service';
import type { TenantContext } from '../../iam/iam.types';
import { ConsentRepository } from '../repositories/consent.repository';
import { DataSubjectService } from './data-subject.service';

const tenant: TenantContext = {
  tenantId: 'tenant-1',
  userId: 'admin-1',
  roleIds: ['ADMIN_EMPRESA'],
  branchIds: [],
  warehouseIds: [],
};

const baseCustomerInput = {
  type: 'PF' as const,
  taxId: '52998224725',
  stateRegistration: null,
  municipalRegistration: null,
  name: 'Fulano de Tal',
  legalName: null,
  address: {
    street: 'Rua A',
    number: '10',
    complement: null,
    district: 'Centro',
    city: 'Goiânia',
    state: 'GO',
    postalCode: '74000000',
  },
  phone: '62999990000',
  whatsapp: null,
  email: 'fulano@teste.dev',
  active: true,
  creditLimit: 1000,
  responsibleSellerId: null,
  priceTableId: null,
  paymentTermId: null,
};

/** O cadastro agora vive no Firestore; aqui basta um cliente em memoria com a
 *  mesma semantica: anonimizar recusa quando ha credito em aberto. */
const setup = (extra: Partial<Customer> = {}) => {
  const customer = {
    ...baseCustomerInput,
    id: 'cliente-1',
    tenantId: tenant.tenantId,
    openCredit: 0,
    financialStatus: 'REGULAR',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    version: 1,
    ...extra,
  } as unknown as Customer;
  const guardado = { atual: customer };
  const clientes = {
    buscar: jest.fn(() => Promise.resolve(guardado.atual)),
    anonimizar: jest.fn(() => {
      if (guardado.atual.openCredit > 0) return Promise.resolve(null);
      guardado.atual = {
        ...guardado.atual,
        name: 'Cliente anonimizado',
        taxId: '00000000000',
        email: null,
      };
      return Promise.resolve(guardado.atual);
    }),
  };
  const partners = new PartnerService(
    new PartnerRepository(),
    new FornecedorRepository(new FakeFirestore() as unknown as Firestore),
  );
  const service = new DataSubjectService(
    new ConsentRepository(),
    partners,
    clientes as unknown as ClienteService,
  );
  return { service, partners, clientes, customer: guardado.atual, guardado };
};

describe('DataSubjectService — consentimento (c39-5)', () => {
  it('registra consentimento e o ultimo por finalidade decide o estado vigente', async () => {
    const { service, customer } = setup();
    service.recordConsent(tenant, customer.id, 'MARKETING', true, '1.2.3.4');
    service.recordConsent(tenant, customer.id, 'DATA_SHARING', false, '1.2.3.4');
    service.recordConsent(tenant, customer.id, 'MARKETING', false, '1.2.3.4');

    const status = service.consentStatus(tenant, customer.id);
    const marketing = status.find((c) => c.purpose === 'MARKETING');
    const sharing = status.find((c) => c.purpose === 'DATA_SHARING');
    expect(marketing?.granted).toBe(false);
    expect(sharing?.granted).toBe(false);
  });
});

describe('DataSubjectService — exportacao (c39-6)', () => {
  it('exporta cadastro, historico e consentimentos do titular', async () => {
    const { service, customer } = setup();
    service.recordConsent(tenant, customer.id, 'ESSENTIAL', true, null);

    const exported = await service.exportSubjectData(tenant, customer.id);
    expect(exported.subjectId).toBe(customer.id);
    expect(exported.sections['cadastro']).toMatchObject({ name: 'Fulano de Tal' });
    expect(Array.isArray(exported.sections['consentimentos'])).toBe(true);
  });
});

describe('DataSubjectService — anonimizacao (c39-7)', () => {
  it('anonimiza quando nao ha credito em aberto', async () => {
    const { service, customer } = setup();
    const result = await service.anonymize(tenant, customer.id);
    expect(result.anonymized).toBe(true);

    const exported = await service.exportSubjectData(tenant, customer.id);
    expect(exported.sections['cadastro']).toMatchObject({
      name: 'Cliente anonimizado',
      taxId: '00000000000',
      email: null,
    });
  });

  it('recusa anonimizar com credito em aberto — guarda financeira prevalece (§49)', async () => {
    // simula credito em aberto, como uma venda a prazo deixaria
    const { service, customer } = setup({ openCredit: 100 });

    const result = await service.anonymize(tenant, customer.id);
    expect(result.anonymized).toBe(false);
    expect(result.refusalReason).toBe('OPEN_FINANCIAL_OBLIGATION');
  });
});
