import { Injectable } from '@nestjs/common';
import type { Category } from '@synapse/types';

@Injectable()
export class CategoryRepository {
  private readonly categories = new Map<string, Category>();

  private key(tenantId: string, id: string): string {
    return `${tenantId}:${id}`;
  }

  save(category: Category): Category {
    this.categories.set(this.key(category.tenantId, category.id), category);
    return category;
  }

  findById(tenantId: string, id: string): Category | undefined {
    return this.categories.get(this.key(tenantId, id));
  }

  listByTenant(tenantId: string): Category[] {
    return [...this.categories.values()].filter((category) => category.tenantId === tenantId);
  }
}
