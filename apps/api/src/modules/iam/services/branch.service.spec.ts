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
      { name: 'Filial A', isHeadquarters: true },
    );
    expect(
      (await service.list({ ...tenant, tenantId: 'tenant-b' })).map((filial) => filial.name),
    ).toEqual(['Matriz']);
  });

  it('empresa sem filial ganha a Matriz uma vez só, mesmo com várias telas abrindo juntas', async () => {
    const db = new FakeFirestore();
    const listas = await Promise.all([
      novoServico(db).list(tenant),
      novoServico(db).list(tenant),
      novoServico(db).list(tenant),
    ]);
    expect(listas.map((lista) => lista.map((filial) => filial.id))).toEqual([
      ['matriz'],
      ['matriz'],
      ['matriz'],
    ]);
    expect(await novoServico(db).list(tenant)).toEqual([
      expect.objectContaining({ id: 'matriz', name: 'Matriz', isHeadquarters: true }),
    ]);
  });

  it('quem atua só em algumas filiais lista só essas', async () => {
    const service = novoServico();
    const matriz = await service.create(tenant, { name: 'Matriz', isHeadquarters: true });
    const aparecida = await service.create(tenant, { name: 'Aparecida', isHeadquarters: false });
    expect(
      (await service.list({ ...tenant, branchIds: [aparecida.id] })).map((filial) => filial.id),
    ).toEqual([aparecida.id]);
    expect((await service.list(tenant)).map((filial) => filial.id)).toEqual([
      matriz.id,
      aparecida.id,
    ]);
  });

  it('não deixa a empresa sem matriz nem com duas', async () => {
    const service = novoServico();
    const matriz = await service.create(tenant, { name: 'Matriz', isHeadquarters: true });
    const filial = await service.create(tenant, { name: 'Aparecida', isHeadquarters: false });
    await expect(service.update(tenant, matriz.id, { isHeadquarters: false })).rejects.toThrow(
      'precisa de uma matriz',
    );
    await expect(service.update(tenant, filial.id, { isHeadquarters: true })).rejects.toThrow(
      'ja tem uma matriz',
    );
    expect((await service.update(tenant, filial.id, { name: 'Filial Aparecida' })).name).toBe(
      'Filial Aparecida',
    );
  });

  it('continua existindo depois de a API reiniciar', async () => {
    const db = new FakeFirestore();
    const criada = await novoServico(db).create(tenant, { name: 'Matriz', isHeadquarters: true });
    expect((await novoServico(db).list(tenant)).map((b) => b.id)).toEqual([criada.id]);
  });
});
