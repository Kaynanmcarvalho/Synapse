import { Body, Controller, Delete, Get, Param, Post, UsePipes } from '@nestjs/common';
import type { DecodedIdToken } from '@synapse/firebase/admin';
import { ZodValidationPipe } from '../../../common/pipes/zod-validation.pipe';
import { CurrentTenant, CurrentUser, SkipDeviceSession } from '../iam.decorators';
import type { TenantContext } from '../iam.types';
import { registerSessionSchema, type RegisterSessionInput } from '../dto/iam.schemas';
import { SessionRepository } from '../repositories/session.repository';

@Controller('auth/sessions')
export class SessionsController {
  constructor(private readonly sessions: SessionRepository) {}

  @Post()
  @SkipDeviceSession()
  @UsePipes(new ZodValidationPipe(registerSessionSchema))
  create(
    @CurrentTenant() tenant: TenantContext,
    @CurrentUser() user: DecodedIdToken,
    @Body() input: RegisterSessionInput,
  ) {
    return this.sessions.create(tenant.tenantId, user.uid, input);
  }

  @Get()
  list(@CurrentTenant() tenant: TenantContext, @CurrentUser() user: DecodedIdToken) {
    return this.sessions.list(tenant.tenantId, user.uid);
  }

  @Delete(':sessionId')
  async revoke(
    @CurrentTenant() tenant: TenantContext,
    @CurrentUser() user: DecodedIdToken,
    @Param('sessionId') sessionId: string,
  ) {
    await this.sessions.revoke(tenant.tenantId, user.uid, sessionId);
    return { revoked: true };
  }
}
