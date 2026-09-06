import {
  type CanActivate,
  type ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { IS_PUBLIC_KEY } from '../../../common/decorators/public.decorator';
import { SKIP_DEVICE_SESSION_KEY, SKIP_TENANT_KEY } from '../iam.decorators';
import type { AuthenticatedRequest } from '../iam.types';
import { SessionRepository } from '../repositories/session.repository';

@Injectable()
export class DeviceSessionGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly sessions: SessionRepository,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const keys = [context.getHandler(), context.getClass()];
    if (
      this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, keys) ||
      this.reflector.getAllAndOverride<boolean>(SKIP_DEVICE_SESSION_KEY, keys) ||
      this.reflector.getAllAndOverride<boolean>(SKIP_TENANT_KEY, keys)
    )
      return true;

    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();
    const tenantId = request.auth?.['tenantId'];
    const sessionId = request.header('X-Device-Session');
    if (typeof tenantId !== 'string' || !request.auth?.uid || !sessionId) {
      throw new UnauthorizedException('Sessão de dispositivo ausente');
    }
    if (!(await this.sessions.isActive(tenantId, request.auth.uid, sessionId))) {
      throw new UnauthorizedException('Sessão de dispositivo revogada ou inválida');
    }
    return true;
  }
}
