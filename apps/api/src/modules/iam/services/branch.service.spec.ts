import type { Firestore } from '@synapse/firebase/admin';
import { FakeFirestore } from '../../../../test/fake-firestore';
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

const novoServico = (db = new FakeFirestore()) =>
  new BranchService(new BranchRepository(db as unknown as Firestore));

describe('BranchService', () => {
  it('cria a matriz e uma filial vinculadas ao tenant', async () => {
    const service = novoServico();
    const hq = await service.create(tenant, { name: 'Matriz', isHeadquarters: true });
    const branch = await service.create(tenant, {
      name: 'Filial Aparecida',
      isHeadquarters: false,
    });

    expect(hq.isHeadquarters).toBe(true);
    expect((await service.list(tenant)).map((b) => b.id)).toEqual([hq.id, branch.id]);
  });

  it('recusa uma segunda matriz para o mesmo tenant', async () => {
    const service = novoServico();
    await service.create(tenant, { name: 'Matriz', isHeadquarters: true });
    await expect(
      service.create(tenant, { name: 'Outra matriz', isHeadquarters: true }),
    ).rejects.toThrow();
  });

  it('recusa excluir a matriz', async () => {
    const service = novoServico();
    const hq = await service.create(tenant, { name: 'Matriz', isHeadquarters: true });
    await expect(service.remove(tenant, hq.id)).rejects.toThrow();
  });

  it('nao vaza filial de outro tenant', async () => {
    const service = novoServico();
    await service.create(
      { ...tenant, tenantId: 'tenant-a' },
      { name: 'Filial A', isHeadquarters: false },
    );
    expect(await service.list({ ...tenant, tenantId: 'tenant-b' })).toHaveLength(0);
  });

  it('continua existindo depois de a API reiniciar', async () => {
    const db = new FakeFirestore();
    const criada = await novoServico(db).create(tenant, { name: 'Matriz', isHeadquarters: true });
    expect((await novoServico(db).list(tenant)).map((b) => b.id)).toEqual([criada.id]);
  });
});
