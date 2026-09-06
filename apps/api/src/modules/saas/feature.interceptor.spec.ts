import type { CallHandler, ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import type { Observable } from 'rxjs';
import { RequireFeature } from './feature.decorator';
import { FeatureInterceptor } from './feature.interceptor';
import { FeatureRepository } from './feature.repository';
import { FeatureService } from './feature.service';
import { SaasRepository } from './saas.repository';

@RequireFeature('NFCE')
class NfceRoute {
  execute() {
    return undefined;
  }
}

describe('FeatureInterceptor', () => {
  it('devolve 403 antes de executar rota de módulo desligado', () => {
    const features = new FeatureService(new FeatureRepository(), new SaasRepository());
    features.setFeature(
      {
        tenantId: 'platform',
        userId: 'root',
        roleIds: ['SUPER_ADMIN_SAAS'],
        branchIds: [],
        warehouseIds: [],
      },
      'tenant',
      { feature: 'NFCE', enabled: false },
    );
    const interceptor = new FeatureInterceptor(new Reflector(), features);
    const context = {
      getHandler: () => NfceRoute.prototype.execute,
      getClass: () => NfceRoute,
      switchToHttp: () => ({ getRequest: () => ({ tenant: { tenantId: 'tenant' } }) }),
    } as unknown as ExecutionContext;
    const next = {
      handle: jest.fn(() => undefined as unknown as Observable<unknown>),
    } as CallHandler;

    expect(() => interceptor.intercept(context, next)).toThrow(/Módulo NFCE está desabilitado/);
    expect(next.handle).not.toHaveBeenCalled();
  });
});
