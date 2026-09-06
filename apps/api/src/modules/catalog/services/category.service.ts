import { Injectable, NotFoundException } from '@nestjs/common';
import { asCategoryId, type Category } from '@synapse/types';
import type { CreateCategoryInput } from '@synapse/validation';
import { randomUUID } from 'node:crypto';
import type { TenantContext } from '../../iam/iam.types';
import { CategoryRepository } from '../repositories/category.repository';

@Injectable()
export class CategoryService {
  constructor(private readonly repository: CategoryRepository) {}

  list(tenant: TenantContext): Category[] {
    return this.repository.listByTenant(tenant.tenantId);
  }

  create(tenant: TenantContext, input: CreateCategoryInput): Category {
    if (input.parentId && !this.repository.findById(tenant.tenantId, input.parentId)) {
      throw new NotFoundException('Categoria pai nao encontrada');
    }
    const category: Category = {
      id: asCategoryId(randomUUID()),
      tenantId: tenant.tenantId as Category['tenantId'],
      name: input.name,
      parentId: input.parentId as Category['parentId'],
    };
    return this.repository.save(category);
  }
}
