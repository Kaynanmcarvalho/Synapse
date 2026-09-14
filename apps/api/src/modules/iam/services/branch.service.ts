import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { asBranchId, type AuditActor, type Branch } from '@synapse/types';
import type { CreateBranchInput, UpdateBranchInput } from '@synapse/validation';
import { randomUUID } from 'node:crypto';
import type { TenantContext } from '../iam.types';
import { BranchRepository } from '../repositories/branch.repository';

/** Id da matriz que o sistema cria para a empresa que ainda não tem filial. */
export const MATRIZ_PADRAO = 'matriz';

@Injectable()
export class BranchService {
  constructor(private readonly repository: BranchRepository) {}

  /** As filiais em que a pessoa atua (membership sem filial = todas). Empresa
   *  sem filial nenhuma ganha a Matriz na primeira leitura: o PDV, o Ponto de
   *  Vendas e o caixa não funcionam sem uma. */
  async list(tenant: TenantContext): Promise<Branch[]> {
    let filiais = await this.repository.listByTenant(tenant.tenantId);
    if (filiais.length === 0) {
      await this.repository.criarSeNaoExiste(this.matrizPadrao(tenant));
      filiais = await this.repository.listByTenant(tenant.tenantId);
    }
    return tenant.branchIds.length === 0
      ? filiais
      : filiais.filter((filial) => tenant.branchIds.includes(filial.id));
  }

  async create(tenant: TenantContext, input: CreateBranchInput): Promise<Branch> {
    const now = new Date().toISOString();
    const actor = this.actor(tenant);
    if (input.isHeadquarters) {
      const existingHq = (await this.repository.listByTenant(tenant.tenantId)).find(
        (branch) => branch.isHeadquarters,
      );
      if (existingHq) throw new ConflictException('O tenant ja tem uma matriz cadastrada');
    }
    const branch: Branch = {
      id: asBranchId(randomUUID()),
      tenantId: tenant.tenantId as Branch['tenantId'],
      name: input.name,
      isHeadquarters: input.isHeadquarters,
      createdAt: now,
      createdBy: actor,
      updatedAt: now,
      updatedBy: actor,
      version: 1,
    };
    return this.repository.save(branch);
  }

  async update(tenant: TenantContext, branchId: string, input: UpdateBranchInput): Promise<Branch> {
    const branch = await this.repository.findById(tenant.tenantId, branchId);
    if (!branch) throw new NotFoundException('Filial nao encontrada');
    if (branch.isHeadquarters && input.isHeadquarters === false)
      throw new ConflictException('A empresa precisa de uma matriz');
    if (!branch.isHeadquarters && input.isHeadquarters) {
      const outraMatriz = (await this.repository.listByTenant(tenant.tenantId)).find(
        (filial) => filial.isHeadquarters,
      );
      if (outraMatriz) throw new ConflictException('O tenant ja tem uma matriz cadastrada');
    }
    const updated: Branch = {
      ...branch,
      name: input.name ?? branch.name,
      isHeadquarters: input.isHeadquarters ?? branch.isHeadquarters,
      updatedAt: new Date().toISOString(),
      updatedBy: this.actor(tenant),
      version: branch.version + 1,
    };
    return this.repository.save(updated);
  }

  async remove(tenant: TenantContext, branchId: string): Promise<void> {
    const branch = await this.repository.findById(tenant.tenantId, branchId);
    if (!branch) throw new NotFoundException('Filial nao encontrada');
    if (branch.isHeadquarters) throw new ConflictException('A matriz nao pode ser excluida');
    await this.repository.delete(tenant.tenantId, branchId);
  }

  private matrizPadrao(tenant: TenantContext): Branch {
    const agora = new Date().toISOString();
    const actor = this.actor(tenant);
    return {
      id: asBranchId(MATRIZ_PADRAO),
      tenantId: tenant.tenantId as Branch['tenantId'],
      name: 'Matriz',
      isHeadquarters: true,
      createdAt: agora,
      createdBy: actor,
      updatedAt: agora,
      updatedBy: actor,
      version: 1,
    };
  }

  private actor(tenant: TenantContext): AuditActor {
    return { uid: tenant.userId as AuditActor['uid'], email: '', name: '', source: 'api' };
  }
}
