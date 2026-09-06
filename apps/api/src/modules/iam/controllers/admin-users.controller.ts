import { Body, Controller, Param, Patch, Post, UseGuards } from '@nestjs/common';
import { ZodValidationPipe } from '../../../common/pipes/zod-validation.pipe';
import { AuditedMutation } from '../../audit/audit.decorator';
import { booleanFlagSchema } from '../dto/iam.schemas';
import { AdminGuard } from '../guards/admin.guard';
import { CurrentTenant, RequirePermission } from '../iam.decorators';
import type { TenantContext } from '../iam.types';
import { AdminUsersService } from '../services/admin-users.service';

@Controller('admin/users')
@UseGuards(AdminGuard)
@RequirePermission('usuario.gerenciar')
@AuditedMutation({ domain: 'PERMISSION', entity: 'UserPermission', collection: 'users' })
export class AdminUsersController {
  constructor(private readonly users: AdminUsersService) {}

  @Patch(':userId/blocked')
  block(
    @CurrentTenant() tenant: TenantContext,
    @Param('userId') userId: string,
    @Body(new ZodValidationPipe(booleanFlagSchema)) body: { enabled: boolean },
  ) {
    return this.users.block(tenant.tenantId, tenant.userId, userId, body.enabled);
  }

  @Patch(':userId/mfa-required')
  requireMfa(
    @CurrentTenant() tenant: TenantContext,
    @Param('userId') userId: string,
    @Body(new ZodValidationPipe(booleanFlagSchema)) body: { enabled: boolean },
  ) {
    return this.users.requireMfa(tenant.tenantId, tenant.userId, userId, body.enabled);
  }

  @Post(':userId/revoke-sessions')
  revokeSessions(@CurrentTenant() tenant: TenantContext, @Param('userId') userId: string) {
    return this.users.revokeSessions(tenant.tenantId, userId);
  }

  @Post(':userId/password-reset-link')
  passwordReset(@CurrentTenant() tenant: TenantContext, @Param('userId') userId: string) {
    return this.users.createPasswordResetLink(tenant.tenantId, userId);
  }
}
