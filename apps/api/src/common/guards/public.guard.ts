import {
  type CanActivate,
  type ExecutionContext,
  Inject,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import type { Auth } from '@synapse/firebase/admin';
import { IS_PUBLIC_KEY } from '../decorators/public.decorator';
import { FIREBASE_AUTH } from '../../modules/iam/firebase.tokens';
import type { AuthenticatedRequest } from '../../modules/iam/iam.types';

@Injectable()
export class AuthGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    @Inject(FIREBASE_AUTH) private readonly auth: Auth,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (isPublic) return true;

    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();
    const authorization = request.headers.authorization;
    const [scheme, token] = authorization?.split(' ') ?? [];
    if (scheme !== 'Bearer' || !token) throw new UnauthorizedException('Token ausente');

    try {
      request.auth = await this.auth.verifyIdToken(token, true);
      return true;
    } catch {
      throw new UnauthorizedException('Token inválido, expirado ou revogado');
    }
  }
}
