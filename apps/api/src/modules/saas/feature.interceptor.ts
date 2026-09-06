import {
  Injectable,
  type CallHandler,
  type ExecutionContext,
  type NestInterceptor,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import type { Observable } from 'rxjs';
import type { AuthenticatedRequest } from '../iam/iam.types';
import { REQUIRED_FEATURE_KEY } from './feature.decorator';
import { FeatureService } from './feature.service';
import type { FeatureKey } from './feature.types';

@Injectable()
export class FeatureInterceptor implements NestInterceptor {
  constructor(
    private readonly reflector: Reflector,
    private readonly features: FeatureService,
  ) {}
  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const feature = this.reflector.getAllAndOverride<FeatureKey>(REQUIRED_FEATURE_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (feature) {
      const request = context.switchToHttp().getRequest<AuthenticatedRequest>();
      if (request.tenant) this.features.assertEnabled(request.tenant.tenantId, feature);
    }
    return next.handle();
  }
}
