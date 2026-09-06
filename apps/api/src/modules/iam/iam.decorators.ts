import {
  createParamDecorator,
  type ExecutionContext,
  SetMetadata,
  UnauthorizedException,
} from '@nestjs/common';
import type { DecodedIdToken } from '@synapse/firebase/admin';
import type { AuthenticatedRequest, TenantContext } from './iam.types';

export const SKIP_APP_CHECK_KEY = 'skipAppCheck';
export const SKIP_TENANT_KEY = 'skipTenant';
export const SKIP_DEVICE_SESSION_KEY = 'skipDeviceSession';
export const ALLOW_CLAIM_INPUT_KEY = 'allowClaimInput';

export const SkipAppCheck = () => SetMetadata(SKIP_APP_CHECK_KEY, true);
export const SkipTenant = () => SetMetadata(SKIP_TENANT_KEY, true);
export const SkipDeviceSession = () => SetMetadata(SKIP_DEVICE_SESSION_KEY, true);

/** Libera a rota do UntrustedClaimsGuard. So para quem administra cargos e
 *  permissoes — e essas rotas validam o conteudo por conta propria. */
export const AllowClaimInput = () => SetMetadata(ALLOW_CLAIM_INPUT_KEY, true);

/** Token ja verificado pelo AuthGuard. Rota publica nao tem: o decorator recusa. */
export const CurrentUser = createParamDecorator(
  (_data: unknown, context: ExecutionContext): DecodedIdToken => {
    const { auth } = context.switchToHttp().getRequest<AuthenticatedRequest>();
    if (!auth) throw new UnauthorizedException('Requisição sem usuário autenticado');
    return auth;
  },
);

/** Contexto resolvido pelo TenantContextInterceptor. Rota com @SkipTenant nao tem. */
export const CurrentTenant = createParamDecorator(
  (_data: unknown, context: ExecutionContext): TenantContext => {
    const { tenant } = context.switchToHttp().getRequest<AuthenticatedRequest>();
    if (!tenant) throw new UnauthorizedException('Requisição sem tenant resolvido');
    return tenant;
  },
);
