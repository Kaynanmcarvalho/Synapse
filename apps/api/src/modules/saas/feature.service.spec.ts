import { ForbiddenException } from '@nestjs/common';
import type { Firestore } from '@synapse/firebase/admin';
import { FakeFirestore } from '../../../test/fake-firestore';
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
  it('bloqueia rota de módulo desligado com 403', async () => {
    const firestore = new FakeFirestore() as unknown as Firestore;
    const service = new FeatureService(
      new FeatureRepository(firestore),
      new SaasRepository(firestore),
    );
    await service.setFeature(root, 'tenant', { feature: 'NFCE', enabled: false });
    await expect(service.assertEnabled('tenant', 'NFCE')).rejects.toThrow(ForbiddenException);
    await expect(service.assertEnabled('tenant', 'NFE')).resolves.toBeUndefined();
  });

  it('libera white-label somente conforme o plano', async () => {
    const firestore = new FakeFirestore() as unknown as Firestore;
    const subscriptions = new SaasRepository(firestore);
    const saas = new SaasService(subscriptions);
    const service = new FeatureService(new FeatureRepository(firestore), subscriptions);
    await saas.create(root, {
      tenantId: 'basic',
      name: 'Basic',
      document: '12345678901',
      plan: 'BASIC',
    });
    await saas.create(root, {
      tenantId: 'enterprise',
      name: 'Enterprise',
      document: '12345678902',
      plan: 'ENTERPRISE',
    });
    await expect(service.setBranding(root, 'basic', { systemName: 'Marca' })).rejects.toThrow(
      /ENTERPRISE/,
    );
    await expect(
      service.setBranding(root, 'enterprise', { systemName: 'Marca', theme: 'dark' }),
    ).resolves.toMatchObject({ branding: { systemName: 'Marca', theme: 'dark' } });
  });

  it('bloqueia módulos quando a assinatura SaaS está suspensa', async () => {
    const firestore = new FakeFirestore() as unknown as Firestore;
    const subscriptions = new SaasRepository(firestore);
    const saas = new SaasService(subscriptions);
    const service = new FeatureService(new FeatureRepository(firestore), subscriptions);
    await saas.create(root, {
      tenantId: 'suspenso',
      name: 'Tenant Suspenso',
      document: '12345678901234',
      plan: 'PROFESSIONAL',
    });
    await saas.update(root, 'suspenso', { status: 'suspended' });
    await expect(service.assertEnabled('suspenso', 'NFE')).rejects.toThrow(/suspensa/);
  });
});
