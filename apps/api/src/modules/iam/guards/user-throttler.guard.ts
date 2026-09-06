import { type ExecutionContext, Injectable } from '@nestjs/common';
import { ThrottlerGuard } from '@nestjs/throttler';
import type { AuthenticatedRequest } from '../iam.types';

/** Executado depois do AuthGuard: a identidade vem do token verificado. */
@Injectable()
export class UserThrottlerGuard extends ThrottlerGuard {
  override async canActivate(context: ExecutionContext): Promise<boolean> {
    if (!context.switchToHttp().getRequest<AuthenticatedRequest>().auth) return true;
    return super.canActivate(context);
  }

  protected override async getTracker(request: Record<string, unknown>): Promise<string> {
    const auth = request['auth'] as { uid: string };
    return `verified-user:${auth.uid}`;
  }
}
