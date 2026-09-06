import { Body, Controller, Get, Post } from '@nestjs/common';
import { createCategorySchema, type CreateCategoryInput } from '@synapse/validation';
import { ZodValidationPipe } from '../../../common/pipes/zod-validation.pipe';
import { AuditedMutation } from '../../audit/audit.decorator';
import { CurrentTenant, RequirePermission } from '../../iam/iam.decorators';
import type { TenantContext } from '../../iam/iam.types';
import { CategoryService } from '../services/category.service';

@Controller('catalog/categories')
export class CategoryController {
  constructor(private readonly categories: CategoryService) {}

  @Get()
  @RequirePermission('produto.visualizar')
  list(@CurrentTenant() tenant: TenantContext) {
    return this.categories.list(tenant);
  }

  @Post()
  @RequirePermission('produto.criar')
  @AuditedMutation({ domain: 'PRODUCT', entity: 'Category', collection: 'categories' })
  create(
    @CurrentTenant() tenant: TenantContext,
    @Body(new ZodValidationPipe(createCategorySchema)) input: CreateCategoryInput,
  ) {
    return this.categories.create(tenant, input);
  }
}
