import {
  type CanActivate,
  type ExecutionContext,
  ForbiddenException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import type { AuthenticatedRequest } from '../iam.types';
import { MembershipRepository } from '../repositories/membership.repository';

const ADMIN_ROLES = new Set(['SUPER_ADMIN_SAAS', 'ADMIN_EMPRESA']);

@Injectable()
export class AdminGuard implements CanActivate {
  constructor(private readonly memberships: MembershipRepository) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();
    const tenantId = request.auth?.['tenantId'];
    if (typeof tenantId !== 'string' || !request.auth?.uid) {
      throw new UnauthorizedException();
    }
    const membership = await this.memberships.find(tenantId, request.auth.uid);
    if (!membership?.roleIds.some((role) => ADMIN_ROLES.has(role))) {
      throw new ForbiddenException('Ação restrita ao administrador da empresa');
    }
    return true;
  }
}
