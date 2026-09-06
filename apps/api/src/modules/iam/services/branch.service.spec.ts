import { BranchRepository } from '../repositories/branch.repository';
import { BranchService } from './branch.service';
import type { TenantContext } from '../iam.types';

const tenant: TenantContext = {
  tenantId: 'tenant-1',
  userId: 'user-1',
  roleIds: ['ADMIN_EMPRESA'],
  branchIds: [],
  warehouseIds: [],
};

describe('BranchService', () => {
  it('cria a matriz e uma filial vinculadas ao tenant', () => {
    const service = new BranchService(new BranchRepository());
    const hq = service.create(tenant, { name: 'Matriz', isHeadquarters: true });
    const branch = service.create(tenant, { name: 'Filial Aparecida', isHeadquarters: false });

    expect(hq.isHeadquarters).toBe(true);
    expect(service.list(tenant).map((b) => b.id)).toEqual([hq.id, branch.id]);
  });

  it('recusa uma segunda matriz para o mesmo tenant', () => {
    const service = new BranchService(new BranchRepository());
    service.create(tenant, { name: 'Matriz', isHeadquarters: true });
    expect(() => service.create(tenant, { name: 'Outra matriz', isHeadquarters: true })).toThrow();
  });

  it('recusa excluir a matriz', () => {
    const service = new BranchService(new BranchRepository());
    const hq = service.create(tenant, { name: 'Matriz', isHeadquarters: true });
    expect(() => service.remove(tenant, hq.id)).toThrow();
  });

  it('nao vaza filial de outro tenant', () => {
    const service = new BranchService(new BranchRepository());
    service.create(
      { ...tenant, tenantId: 'tenant-a' },
      { name: 'Filial A', isHeadquarters: false },
    );
    expect(service.list({ ...tenant, tenantId: 'tenant-b' })).toHaveLength(0);
  });
});
