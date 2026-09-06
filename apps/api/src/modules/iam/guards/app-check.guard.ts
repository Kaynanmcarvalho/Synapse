import {
  type CanActivate,
  type ExecutionContext,
  Inject,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import type { AppCheck } from '@synapse/firebase/admin';
import { IS_PUBLIC_KEY } from '../../../common/decorators/public.decorator';
import { FIREBASE_APP_CHECK } from '../firebase.tokens';
import { SKIP_APP_CHECK_KEY } from '../iam.decorators';
import type { AuthenticatedRequest } from '../iam.types';

@Injectable()
export class AppCheckGuard implements CanActivate {
  /** App Check nao tem emulador oficial verificavel pelo Admin SDK, entao nao da
   *  para exigi-lo em desenvolvimento local sem um site key real. Em producao o
   *  enforcement e sempre obrigatorio, ignorando a flag. */
  static isEnforced(): boolean {
    if (process.env['NODE_ENV'] === 'production') return true;
    return process.env['APP_CHECK_ENFORCEMENT'] !== 'false';
  }

  constructor(
    private readonly reflector: Reflector,
    @Inject(FIREBASE_APP_CHECK) private readonly appCheck: AppCheck,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const skip = this.reflector.getAllAndOverride<boolean>(SKIP_APP_CHECK_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (skip || isPublic || !AppCheckGuard.isEnforced()) return true;

    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();
    const token = request.header('X-Firebase-AppCheck');
    if (!token) throw new UnauthorizedException('App Check ausente');
    try {
      await this.appCheck.verifyToken(token);
      return true;
    } catch {
      throw new UnauthorizedException('App Check inválido');
    }
  }
}
