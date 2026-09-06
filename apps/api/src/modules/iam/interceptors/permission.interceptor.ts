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
import { REQUIRE_PERMISSION_KEY, type RequirePermissionOptions } from '../iam.decorators';
import type { AuthenticatedRequest } from '../iam.types';
import { RoleService } from '../services/role.service';

/** Precisa rodar como interceptor, nao como guard: o request.tenant so existe
 *  depois do TenantContextInterceptor, e guards executam antes de interceptors
 *  no ciclo de vida do Nest. Registrado depois dele em iam.module.ts.
 *
 *  Sem @RequirePermission a rota fica fechada por padrao — precisa ser marcada
 *  @Public (rota sem tenant) para ficar fora deste checador. */
@Injectable()
export class PermissionInterceptor implements NestInterceptor {
  constructor(
    private readonly reflector: Reflector,
    private readonly roles: RoleService,
  ) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const keys = [context.getHandler(), context.getClass()];
    if (this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, keys)) return next.handle();

    const required = this.reflector.getAllAndOverride<RequirePermissionOptions>(
      REQUIRE_PERMISSION_KEY,
      keys,
    );
    if (!required) return next.handle();

    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();
    if (!request.tenant) throw new UnauthorizedException('Requisição sem tenant resolvido');

    const branchId = required.branchParam
      ? (request.params?.[required.branchParam] as string | undefined)
      : undefined;
    const warehouseId = required.warehouseParam
      ? (request.params?.[required.warehouseParam] as string | undefined)
      : undefined;

    if (!this.roles.hasPermission(request.tenant, required.permission, { branchId, warehouseId })) {
      throw new ForbiddenException(`Permissão necessária: ${required.permission}`);
    }
    return next.handle();
  }
}
