import { ConflictException, NotFoundException } from '@nestjs/common';
import type { Seller } from '@synapse/types';
import type { TenantContext } from '../../iam/iam.types';
import type { SellerRepository } from '../repositories/seller.repository';
import { SellerService } from './seller.service';

const context: TenantContext = {
  tenantId: 'tenant-1',
  userId: 'user-1',
  roleIds: [],
  branchIds: [],
  warehouseIds: [],
};

class FakeRepository {
  sellers = new Map<string, Seller>();
  async create(_tenantId: string, seller: Seller) {
    this.sellers.set(seller.id, seller);
    return seller;
  }
  async findById(_tenantId: string, id: string) {
    return this.sellers.get(id) ?? null;
  }
  async update(_tenantId: string, seller: Seller) {
    this.sellers.set(seller.id, seller);
    return seller;
  }
  async listByTenant(_tenantId: string) {
    return [...this.sellers.values()];
  }
}

function buildService() {
  const repository = new FakeRepository();
  const service = new SellerService(repository as unknown as SellerRepository);
  return { service, repository };
}

const input = {
  userId: 'seller-1',
  name: 'Vendedor Um',
  branchId: 'matriz',
  region: 'Goiânia',
  route: null,
  commissionPercent: 5,
  monthlyGoalCentavos: 100_000,
};

describe('SellerService', () => {
  it('cria um perfil de vendedor', async () => {
    const { service } = buildService();
    const seller = await service.create(context, input);
    expect(seller.id).toBe('seller-1');
    expect(seller.active).toBe(true);
  });

  it('recusa criar um segundo perfil para o mesmo usuário', async () => {
    const { service } = buildService();
    await service.create(context, input);
    await expect(service.create(context, input)).rejects.toBeInstanceOf(ConflictException);
  });

  it('atualiza só os campos informados, preservando o resto', async () => {
    const { service } = buildService();
    const created = await service.create(context, input);
    const updated = await service.update(context, created.id, { commissionPercent: 8 });
    expect(updated.commissionPercent).toBe(8);
    expect(updated.name).toBe(input.name);
    expect(updated.region).toBe(input.region);
  });

  it('lança NotFoundException para um vendedor que não existe', async () => {
    const { service } = buildService();
    await expect(
      service.getOwnProfile({ ...context, userId: 'nao-existe' }),
    ).rejects.toBeInstanceOf(NotFoundException);
  });
});
