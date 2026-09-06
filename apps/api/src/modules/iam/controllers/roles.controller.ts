import { Body, Controller, Delete, Get, Param, Patch, Post } from '@nestjs/common';
import {
  createRoleSchema,
  updateRoleSchema,
  type CreateRoleInput,
  type UpdateRoleInput,
} from '@synapse/validation';
import { ZodValidationPipe } from '../../../common/pipes/zod-validation.pipe';
import { AuditedMutation } from '../../audit/audit.decorator';
import { AllowClaimInput, CurrentTenant, RequirePermission } from '../iam.decorators';
import type { TenantContext } from '../iam.types';
import { RoleService } from '../services/role.service';

@Controller('iam/roles')
export class RolesController {
  constructor(private readonly roles: RoleService) {}

  @Get()
  @RequirePermission('cargo.gerenciar')
  list(@CurrentTenant() tenant: TenantContext) {
    return this.roles.list(tenant);
  }

  @Post()
  @RequirePermission('cargo.gerenciar')
  @AllowClaimInput()
  @AuditedMutation({ domain: 'PERMISSION', entity: 'Role', collection: 'roles' })
  create(
    @CurrentTenant() tenant: TenantContext,
    @Body(new ZodValidationPipe(createRoleSchema)) input: CreateRoleInput,
  ) {
    return this.roles.create(tenant, input);
  }

  @Patch(':id')
  @RequirePermission('cargo.gerenciar')
  @AllowClaimInput()
  @AuditedMutation({ domain: 'PERMISSION', entity: 'Role', collection: 'roles' })
  update(
    @CurrentTenant() tenant: TenantContext,
    @Param('id') id: string,
    @Body(new ZodValidationPipe(updateRoleSchema)) input: UpdateRoleInput,
  ) {
    return this.roles.update(tenant, id, input);
  }

  @Delete(':id')
  @RequirePermission('cargo.gerenciar')
  @AuditedMutation({ domain: 'PERMISSION', entity: 'Role', collection: 'roles' })
  remove(@CurrentTenant() tenant: TenantContext, @Param('id') id: string) {
    this.roles.remove(tenant, id);
    return { removed: true };
  }
}
