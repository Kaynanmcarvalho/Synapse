import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import type { SavedFilter } from '@synapse/types';
import { randomUUID } from 'node:crypto';
import type { TenantContext } from '../../iam/iam.types';
import type { CreateSavedFilterInput } from '../dto/search.schemas';
import { SavedFilterRepository } from '../repositories/saved-filter.repository';

@Injectable()
export class SavedFilterService {
  constructor(private readonly repository: SavedFilterRepository) {}

  async create(context: TenantContext, input: CreateSavedFilterInput): Promise<SavedFilter> {
    const filter: SavedFilter = {
      id: randomUUID(),
      tenantId: context.tenantId as SavedFilter['tenantId'],
      userId: context.userId as SavedFilter['userId'],
      screen: input.screen,
      name: input.name,
      filterState: input.filterState,
      createdAt: new Date().toISOString(),
    };
    return this.repository.create(context.tenantId, filter);
  }

  list(context: TenantContext, screen: string): Promise<SavedFilter[]> {
    return this.repository.listByUserAndScreen(context.tenantId, context.userId, screen);
  }

  async delete(context: TenantContext, id: string): Promise<void> {
    const existing = await this.repository.findById(context.tenantId, id);
    if (!existing) throw new NotFoundException('Filtro salvo não encontrado');
    // Cada pessoa só apaga o próprio filtro — "salvo por usuário" (§60) não é
    // um recurso do tenant inteiro, é pessoal.
    if (existing.userId !== context.userId) {
      throw new ForbiddenException('Este filtro pertence a outro usuário');
    }
    await this.repository.delete(context.tenantId, id);
  }
}
