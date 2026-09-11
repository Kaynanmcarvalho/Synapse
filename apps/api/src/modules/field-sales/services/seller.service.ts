import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import type { Seller } from '@synapse/types';
import type { TenantContext } from '../../iam/iam.types';
import type { CreateSellerInput, UpdateSellerInput } from '../dto/field-sales.schemas';
import { SellerRepository } from '../repositories/seller.repository';

@Injectable()
export class SellerService {
  constructor(private readonly repository: SellerRepository) {}

  async create(context: TenantContext, input: CreateSellerInput): Promise<Seller> {
    const existing = await this.repository.findById(context.tenantId, input.userId);
    if (existing) throw new ConflictException('Este usuário já tem um perfil de vendedor');
    const seller: Seller = {
      id: input.userId,
      tenantId: context.tenantId as Seller['tenantId'],
      userId: input.userId as Seller['userId'],
      name: input.name,
      branchId: input.branchId as Seller['branchId'],
      region: input.region,
      route: input.route ?? null,
      commissionPercent: input.commissionPercent,
      monthlyGoalCentavos: input.monthlyGoalCentavos,
      active: true,
      createdAt: new Date().toISOString(),
    };
    return this.repository.create(context.tenantId, seller);
  }

  async update(
    context: TenantContext,
    sellerId: string,
    input: UpdateSellerInput,
  ): Promise<Seller> {
    const existing = await this.getOrThrow(context.tenantId, sellerId);
    const updated: Seller = {
      ...existing,
      name: input.name ?? existing.name,
      branchId: (input.branchId as Seller['branchId']) ?? existing.branchId,
      region: input.region ?? existing.region,
      route: input.route === undefined ? existing.route : input.route,
      commissionPercent: input.commissionPercent ?? existing.commissionPercent,
      monthlyGoalCentavos: input.monthlyGoalCentavos ?? existing.monthlyGoalCentavos,
      active: input.active ?? existing.active,
    };
    return this.repository.update(context.tenantId, updated);
  }

  list(context: TenantContext): Promise<Seller[]> {
    return this.repository.listByTenant(context.tenantId);
  }

  async getOwnProfile(context: TenantContext): Promise<Seller> {
    return this.getOrThrow(context.tenantId, context.userId);
  }

  private async getOrThrow(tenantId: string, id: string): Promise<Seller> {
    const seller = await this.repository.findById(tenantId, id);
    if (!seller) throw new NotFoundException('Perfil de vendedor não encontrado');
    return seller;
  }
}
