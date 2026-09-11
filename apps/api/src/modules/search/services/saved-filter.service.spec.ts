import { ForbiddenException, NotFoundException } from '@nestjs/common';
import type { SavedFilter } from '@synapse/types';
import type { TenantContext } from '../../iam/iam.types';
import type { SavedFilterRepository } from '../repositories/saved-filter.repository';
import { SavedFilterService } from './saved-filter.service';

const tenant: TenantContext = {
  tenantId: 'tenant-1',
  userId: 'user-1',
  roleIds: [],
  branchIds: [],
  warehouseIds: [],
};

class FakeRepository {
  filters = new Map<string, SavedFilter>();
  async create(_tenantId: string, filter: SavedFilter) {
    this.filters.set(filter.id, filter);
    return filter;
  }
  async listByUserAndScreen(_tenantId: string, userId: string, screen: string) {
    return [...this.filters.values()].filter(
      (filter) => filter.userId === userId && filter.screen === screen,
    );
  }
  async findById(_tenantId: string, id: string) {
    return this.filters.get(id) ?? null;
  }
  async delete(_tenantId: string, id: string) {
    this.filters.delete(id);
  }
}

function buildService() {
  const repository = new FakeRepository();
  const service = new SavedFilterService(repository as unknown as SavedFilterRepository);
  return { service, repository };
}

describe('SavedFilterService', () => {
  it('cria e lista o filtro salvo do próprio usuário na tela', async () => {
    const { service } = buildService();
    await service.create(tenant, {
      screen: 'estoque-inteligencia',
      name: 'Só classe A',
      filterState: { abcClass: 'A' },
    });
    const list = await service.list(tenant, 'estoque-inteligencia');
    expect(list).toHaveLength(1);
    expect(list[0]?.name).toBe('Só classe A');
  });

  it('não lista filtro salvo de outra tela', async () => {
    const { service } = buildService();
    await service.create(tenant, { screen: 'compras', name: 'X', filterState: {} });
    const list = await service.list(tenant, 'estoque-inteligencia');
    expect(list).toEqual([]);
  });

  it('deixa o dono apagar o próprio filtro', async () => {
    const { service } = buildService();
    const created = await service.create(tenant, { screen: 'compras', name: 'X', filterState: {} });
    await service.delete(tenant, created.id);
    const list = await service.list(tenant, 'compras');
    expect(list).toEqual([]);
  });

  it('recusa apagar um filtro que não existe', async () => {
    const { service } = buildService();
    await expect(service.delete(tenant, 'nao-existe')).rejects.toBeInstanceOf(NotFoundException);
  });

  it('recusa apagar o filtro de outro usuário', async () => {
    const { service, repository } = buildService();
    repository.filters.set('f1', {
      id: 'f1',
      tenantId: tenant.tenantId,
      userId: 'outro-usuario',
      screen: 'compras',
      name: 'X',
      filterState: {},
      createdAt: '2026-01-01T00:00:00.000Z',
    } as SavedFilter);

    await expect(service.delete(tenant, 'f1')).rejects.toBeInstanceOf(ForbiddenException);
  });
});
