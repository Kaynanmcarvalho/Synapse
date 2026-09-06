import { Body, Controller, Delete, Get, Param, Patch, Post } from '@nestjs/common';
import {
  createBranchSchema,
  updateBranchSchema,
  type CreateBranchInput,
  type UpdateBranchInput,
} from '@synapse/validation';
import { ZodValidationPipe } from '../../../common/pipes/zod-validation.pipe';
import { AuditedMutation } from '../../audit/audit.decorator';
import { CurrentTenant, RequirePermission } from '../iam.decorators';
import type { TenantContext } from '../iam.types';
import { BranchService } from '../services/branch.service';

@Controller('iam/branches')
export class BranchesController {
  constructor(private readonly branches: BranchService) {}

  @Get()
  @RequirePermission('filial.gerenciar')
  list(@CurrentTenant() tenant: TenantContext) {
    return this.branches.list(tenant);
  }

  @Post()
  @RequirePermission('filial.gerenciar')
  @AuditedMutation({ domain: 'BRANCH', entity: 'Branch', collection: 'branches' })
  create(
    @CurrentTenant() tenant: TenantContext,
    @Body(new ZodValidationPipe(createBranchSchema)) input: CreateBranchInput,
  ) {
    return this.branches.create(tenant, input);
  }

  @Patch(':id')
  @RequirePermission('filial.gerenciar', 'id')
  @AuditedMutation({ domain: 'BRANCH', entity: 'Branch', collection: 'branches' })
  update(
    @CurrentTenant() tenant: TenantContext,
    @Param('id') id: string,
    @Body(new ZodValidationPipe(updateBranchSchema)) input: UpdateBranchInput,
  ) {
    return this.branches.update(tenant, id, input);
  }

  @Delete(':id')
  @RequirePermission('filial.gerenciar')
  @AuditedMutation({ domain: 'BRANCH', entity: 'Branch', collection: 'branches' })
  remove(@CurrentTenant() tenant: TenantContext, @Param('id') id: string) {
    this.branches.remove(tenant, id);
    return { removed: true };
  }
}
