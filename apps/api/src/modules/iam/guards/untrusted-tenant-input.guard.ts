import {
  type CanActivate,
  type ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import type { AuthenticatedRequest } from '../iam.types';

const containsTenantId = (value: unknown): boolean => {
  if (!value || typeof value !== 'object') return false;
  if (Object.prototype.hasOwnProperty.call(value, 'tenantId')) return true;
  return Object.values(value).some(containsTenantId);
};

@Injectable()
export class UntrustedTenantInputGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();
    if (containsTenantId(request.body) || containsTenantId(request.query)) {
      throw new ForbiddenException('tenantId é derivado da sessão e não pode ser enviado');
    }
    return true;
  }
}
