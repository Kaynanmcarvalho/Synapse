import { ConflictException, ForbiddenException } from '@nestjs/common';
import type { Firestore } from '@synapse/firebase/admin';
import { FakeFirestore } from '../../../test/fake-firestore';
import type { TenantContext } from '../iam/iam.types';
import { SaasRepository } from './saas.repository';
import { SaasService } from './saas.service';

const superAdmin: TenantContext = {
  tenantId: 'platform',
  userId: 'root',
  roleIds: ['SUPER_ADMIN_SAAS'],
  branchIds: [],
  warehouseIds: [],
};

describe('SaasService', () => {
  let service: SaasService;
  let firestore: Firestore;
  beforeEach(() => {
    firestore = new FakeFirestore() as unknown as Firestore;
    service = new SaasService(new SaasRepository(firestore));
  });

  it('mede consumo, avisa em 80% e bloqueia acima do limite', async () => {
    await service.create(superAdmin, {
      tenantId: 'tenant',
      name: 'Loja',
      document: '12345678901234',
      plan: 'BASIC',
    });
    await expect(
      service.consume(superAdmin, 'tenant', { resource: 'users', delta: 4 }),
    ).resolves.toMatchObject({ used: 4, limit: 5, percentage: 80, warning: true });
    await expect(
      service.consume(superAdmin, 'tenant', { resource: 'users', delta: 2 }),
    ).rejects.toThrow(ConflictException);
  });

  it('suspende, reativa e agrega métricas da plataforma', async () => {
    await service.create(superAdmin, {
      tenantId: 'tenant',
      name: 'Loja',
      document: '12345678901234',
      plan: 'PROFESSIONAL',
    });
    await service.update(superAdmin, 'tenant', { status: 'active' });
    await service.consume(superAdmin, 'tenant', { resource: 'users', delta: 3 });
    await expect(service.metrics(superAdmin)).resolves.toMatchObject({
      companies: 1,
      activeCompanies: 1,
      users: 3,
    });
    await service.update(superAdmin, 'tenant', { status: 'suspended' });
    await expect(
      service.consume(superAdmin, 'tenant', { resource: 'products', delta: 1 }),
    ).rejects.toThrow(/suspensa/);
    await expect(service.update(superAdmin, 'tenant', { status: 'active' })).resolves.toMatchObject(
      {
        status: 'active',
      },
    );
  });

  it('recusa acesso de administrador de empresa', async () => {
    await expect(service.list({ ...superAdmin, roleIds: ['ADMIN_EMPRESA'] })).rejects.toThrow(
      ForbiddenException,
    );
  });

  it('mantém assinatura e consumo depois de recriar o serviço', async () => {
    await service.create(superAdmin, {
      tenantId: 'tenant-persistente',
      name: 'Loja Persistente',
      document: '12345678901234',
      plan: 'BASIC',
    });
    await service.consume(superAdmin, 'tenant-persistente', { resource: 'users', delta: 2 });
    const restarted = new SaasService(new SaasRepository(firestore));
    await expect(restarted.list(superAdmin)).resolves.toEqual([
      expect.objectContaining({
        tenantId: 'tenant-persistente',
        usage: expect.objectContaining({ users: 2 }),
      }),
    ]);
  });
});
