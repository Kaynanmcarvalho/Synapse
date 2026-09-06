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
import {
  REQUIRE_PERMISSION_KEY,
  SKIP_PERMISSION_KEY,
  type RequirePermissionOptions,
} from '../iam.decorators';
import type { AuthenticatedRequest } from '../iam.types';
import { RoleService } from '../services/role.service';

/** Precisa rodar como interceptor, nao como guard: o request.tenant so existe
 *  depois do TenantContextInterceptor, e guards executam antes de interceptors
 *  no ciclo de vida do Nest. Registrado depois dele em iam.module.ts.
 *
 *  Fechado por padrao (§62, achado da revisao de seguranca F10): uma rota sem
 *  @RequirePermission, @SkipPermission ou @Public e recusada. Antes disso o
 *  interceptor deixava passar em silencio quando faltava @RequirePermission —
 *  qualquer membro autenticado do tenant podia chamar qualquer rota nova sem
 *  ninguem perceber a falta do decorator. */
@Injectable()
export class PermissionInterceptor implements NestInterceptor {
  constructor(
    private readonly reflector: Reflector,
    private readonly roles: RoleService,
  ) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const keys = [context.getHandler(), context.getClass()];
    if (this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, keys)) return next.handle();
    if (this.reflector.getAllAndOverride<boolean>(SKIP_PERMISSION_KEY, keys)) return next.handle();

    const required = this.reflector.getAllAndOverride<RequirePermissionOptions>(
      REQUIRE_PERMISSION_KEY,
      keys,
    );
    if (!required) {
      throw new ForbiddenException(
        'Rota sem @RequirePermission — bloqueada por padrão. Marque @RequirePermission ou @SkipPermission explicitamente.',
      );
    }

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
