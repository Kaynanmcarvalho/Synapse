import {
  type CallHandler,
  type ExecutionContext,
  ForbiddenException,
  Injectable,
  type NestInterceptor,
  UnauthorizedException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import type { Observable } from 'rxjs';
import { IS_PUBLIC_KEY } from '../../../common/decorators/public.decorator';
import { SKIP_TENANT_KEY } from '../iam.decorators';
import type { AuthenticatedRequest } from '../iam.types';
import { MembershipRepository } from '../repositories/membership.repository';

@Injectable()
export class TenantContextInterceptor implements NestInterceptor {
  constructor(
    private readonly reflector: Reflector,
    private readonly memberships: MembershipRepository,
  ) {}

  async intercept(context: ExecutionContext, next: CallHandler): Promise<Observable<unknown>> {
    const keys = [context.getHandler(), context.getClass()];
    if (
      this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, keys) ||
      this.reflector.getAllAndOverride<boolean>(SKIP_TENANT_KEY, keys)
    )
      return next.handle();

    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();
    const tenantId = request.auth?.['tenantId'];
    if (typeof tenantId !== 'string' || !request.auth?.uid) {
      throw new UnauthorizedException('Token sem tenant ativo');
    }

    const membership = await this.memberships.find(tenantId, request.auth.uid);
    if (!membership || membership.authUid !== request.auth.uid || membership.status !== 'active') {
      throw new ForbiddenException('Usuário não pertence ao tenant ativo');
    }

    const firebaseClaims = request.auth.firebase as Record<string, unknown> | undefined;
    if (membership.mfaRequired && !firebaseClaims?.['sign_in_second_factor']) {
      throw new ForbiddenException('MFA_REQUIRED');
    }

    request.tenant = {
      tenantId,
      userId: request.auth.uid,
      roleIds: membership.roleIds,
      branchIds: membership.branchIds,
      warehouseIds: membership.warehouseIds,
    };
    return next.handle();
  }
}
