import { ForbiddenException } from '@nestjs/common';
import type { TenantContext } from '../iam/iam.types';
import { FeatureRepository } from './feature.repository';
import { FeatureService } from './feature.service';
import { SaasRepository } from './saas.repository';
import { SaasService } from './saas.service';

const root: TenantContext = {
  tenantId: 'platform',
  userId: 'root',
  roleIds: ['SUPER_ADMIN_SAAS'],
  branchIds: [],
  warehouseIds: [],
};

describe('FeatureService', () => {
  it('bloqueia rota de módulo desligado com 403', () => {
    const service = new FeatureService(new FeatureRepository(), new SaasRepository());
    service.setFeature(root, 'tenant', { feature: 'NFCE', enabled: false });
    expect(() => service.assertEnabled('tenant', 'NFCE')).toThrow(ForbiddenException);
    expect(() => service.assertEnabled('tenant', 'NFE')).not.toThrow();
  });

  it('libera white-label somente conforme o plano', () => {
    const subscriptions = new SaasRepository();
    const saas = new SaasService(subscriptions);
    const service = new FeatureService(new FeatureRepository(), subscriptions);
    saas.create(root, { tenantId: 'basic', name: 'Basic', document: '12345678901', plan: 'BASIC' });
    saas.create(root, {
      tenantId: 'enterprise',
      name: 'Enterprise',
      document: '12345678902',
      plan: 'ENTERPRISE',
    });
    expect(() => service.setBranding(root, 'basic', { systemName: 'Marca' })).toThrow(/ENTERPRISE/);
    expect(
      service.setBranding(root, 'enterprise', { systemName: 'Marca', theme: 'dark' }).branding,
    ).toMatchObject({ systemName: 'Marca', theme: 'dark' });
  });
});
