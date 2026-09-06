import { Body, Controller, Param, Patch, Post, Req, UseGuards, UsePipes } from '@nestjs/common';
import { ZodValidationPipe } from '../../../common/pipes/zod-validation.pipe';
import { booleanFlagSchema } from '../dto/iam.schemas';
import { AdminGuard } from '../guards/admin.guard';
import type { AuthenticatedRequest } from '../iam.types';
import { AdminUsersService } from '../services/admin-users.service';

@Controller('admin/users')
@UseGuards(AdminGuard)
export class AdminUsersController {
  constructor(private readonly users: AdminUsersService) {}

  @Patch(':userId/blocked')
  @UsePipes(new ZodValidationPipe(booleanFlagSchema))
  block(
    @Req() request: AuthenticatedRequest,
    @Param('userId') userId: string,
    @Body() body: { enabled: boolean },
  ) {
    return this.users.block(request.tenant!.tenantId, request.tenant!.userId, userId, body.enabled);
  }

  @Patch(':userId/mfa-required')
  @UsePipes(new ZodValidationPipe(booleanFlagSchema))
  requireMfa(
    @Req() request: AuthenticatedRequest,
    @Param('userId') userId: string,
    @Body() body: { enabled: boolean },
  ) {
    return this.users.requireMfa(
      request.tenant!.tenantId,
      request.tenant!.userId,
      userId,
      body.enabled,
    );
  }

  @Post(':userId/revoke-sessions')
  revokeSessions(@Req() request: AuthenticatedRequest, @Param('userId') userId: string) {
    return this.users.revokeSessions(request.tenant!.tenantId, userId);
  }

  @Post(':userId/password-reset-link')
  passwordReset(@Req() request: AuthenticatedRequest, @Param('userId') userId: string) {
    return this.users.createPasswordResetLink(request.tenant!.tenantId, userId);
  }
}
