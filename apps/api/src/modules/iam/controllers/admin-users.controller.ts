import { Body, Controller, Param, Patch, Post, UseGuards, UsePipes } from '@nestjs/common';
import { ZodValidationPipe } from '../../../common/pipes/zod-validation.pipe';
import { booleanFlagSchema } from '../dto/iam.schemas';
import { AdminGuard } from '../guards/admin.guard';
import { CurrentTenant } from '../iam.decorators';
import type { TenantContext } from '../iam.types';
import { AdminUsersService } from '../services/admin-users.service';

@Controller('admin/users')
@UseGuards(AdminGuard)
export class AdminUsersController {
  constructor(private readonly users: AdminUsersService) {}

  @Patch(':userId/blocked')
  @UsePipes(new ZodValidationPipe(booleanFlagSchema))
  block(
    @CurrentTenant() tenant: TenantContext,
    @Param('userId') userId: string,
    @Body() body: { enabled: boolean },
  ) {
    return this.users.block(tenant.tenantId, tenant.userId, userId, body.enabled);
  }

  @Patch(':userId/mfa-required')
  @UsePipes(new ZodValidationPipe(booleanFlagSchema))
  requireMfa(
    @CurrentTenant() tenant: TenantContext,
    @Param('userId') userId: string,
    @Body() body: { enabled: boolean },
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
