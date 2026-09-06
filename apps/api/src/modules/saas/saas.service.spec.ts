import { ConflictException, ForbiddenException } from '@nestjs/common';
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
  beforeEach(() => {
    service = new SaasService(new SaasRepository());
  });

  it('mede consumo, avisa em 80% e bloqueia acima do limite', () => {
    service.create(superAdmin, {
      tenantId: 'tenant',
      name: 'Loja',
      document: '12345678901234',
      plan: 'BASIC',
    });
    expect(service.consume(superAdmin, 'tenant', { resource: 'users', delta: 4 })).toMatchObject({
      used: 4,
      limit: 5,
      percentage: 80,
      warning: true,
    });
    expect(() => service.consume(superAdmin, 'tenant', { resource: 'users', delta: 2 })).toThrow(
      ConflictException,
    );
  });

  it('suspende, reativa e agrega métricas da plataforma', () => {
    service.create(superAdmin, {
      tenantId: 'tenant',
      name: 'Loja',
      document: '12345678901234',
      plan: 'PROFESSIONAL',
    });
    service.update(superAdmin, 'tenant', { status: 'active' });
    service.consume(superAdmin, 'tenant', { resource: 'users', delta: 3 });
    expect(service.metrics(superAdmin)).toMatchObject({
      companies: 1,
      activeCompanies: 1,
      users: 3,
    });
    service.update(superAdmin, 'tenant', { status: 'suspended' });
    expect(() => service.consume(superAdmin, 'tenant', { resource: 'products', delta: 1 })).toThrow(
      /suspensa/,
    );
    expect(service.update(superAdmin, 'tenant', { status: 'active' }).status).toBe('active');
  });

  it('recusa acesso de administrador de empresa', () => {
    expect(() => service.list({ ...superAdmin, roleIds: ['ADMIN_EMPRESA'] })).toThrow(
      ForbiddenException,
    );
  });
});
