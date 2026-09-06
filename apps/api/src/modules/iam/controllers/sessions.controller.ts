import { Body, Controller, Delete, Get, Param, Post, Req, UsePipes } from '@nestjs/common';
import { ZodValidationPipe } from '../../../common/pipes/zod-validation.pipe';
import { SkipDeviceSession } from '../iam.decorators';
import type { AuthenticatedRequest } from '../iam.types';
import { registerSessionSchema, type RegisterSessionInput } from '../dto/iam.schemas';
import { SessionRepository } from '../repositories/session.repository';

@Controller('auth/sessions')
export class SessionsController {
  constructor(private readonly sessions: SessionRepository) {}

  @Post()
  @SkipDeviceSession()
  @UsePipes(new ZodValidationPipe(registerSessionSchema))
  create(@Req() request: AuthenticatedRequest, @Body() input: RegisterSessionInput) {
    return this.sessions.create(request.tenant!.tenantId, request.auth!.uid, input);
  }

  @Get()
  list(@Req() request: AuthenticatedRequest) {
    return this.sessions.list(request.tenant!.tenantId, request.auth!.uid);
  }

  @Delete(':sessionId')
  async revoke(@Req() request: AuthenticatedRequest, @Param('sessionId') sessionId: string) {
    await this.sessions.revoke(request.tenant!.tenantId, request.auth!.uid, sessionId);
    return { revoked: true };
  }
}
