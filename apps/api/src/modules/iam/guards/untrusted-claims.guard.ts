import {
  type CanActivate,
  type ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { ALLOW_CLAIM_INPUT_KEY } from '../iam.decorators';
import type { AuthenticatedRequest } from '../iam.types';

/** §31: role, permissao e tenantId nunca vem do cliente — o backend deriva os tres
 *  da sessao a cada requisicao. Mandar qualquer um deles no corpo ou na query e
 *  tentativa de escalar privilegio, e a requisicao morre aqui. */
const SERVER_DERIVED_FIELDS = new Set([
  'tenantid',
  'role',
  'roles',
  'roleids',
  'permission',
  'permissions',
  'branchids',
  'warehouseids',
  'mfarequired',
]);

/** Percurso iterativo: corpo aninhado de propósito nao derruba o processo. */
const findForgedField = (root: unknown): string | null => {
  const queue: unknown[] = [root];
  let visited = 0;

  while (queue.length > 0 && visited < 10_000) {
    const value = queue.shift();
    visited += 1;
    if (!value || typeof value !== 'object') continue;

    for (const [key, nested] of Object.entries(value)) {
      if (SERVER_DERIVED_FIELDS.has(key.toLowerCase())) return key;
      if (nested && typeof nested === 'object') queue.push(nested);
    }
  }
  return null;
};

@Injectable()
export class UntrustedClaimsGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    // O modulo de RBAC precisa receber permissions no corpo para montar cargos;
    // essas rotas se declaram com @AllowClaimInput e validam por conta propria.
    const allowed = this.reflector.getAllAndOverride<boolean>(ALLOW_CLAIM_INPUT_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (allowed) return true;

    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();
    const forged = findForgedField(request.body) ?? findForgedField(request.query);
    if (forged) {
      throw new ForbiddenException(`${forged} é derivado da sessão e não pode ser enviado`);
    }
    return true;
  }
}
