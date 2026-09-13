import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import type { TenantContext } from '../iam/iam.types';
import type { UpdateBrandingInput, UpdateFeatureInput } from './dto/feature.schemas';
import { FeatureRepository } from './feature.repository';
import {
  FEATURE_KEYS,
  type FeatureFlags,
  type FeatureKey,
  type TenantExperience,
} from './feature.types';
import { SaasRepository } from './saas.repository';

const allEnabled = (): FeatureFlags =>
  Object.fromEntries(FEATURE_KEYS.map((key) => [key, true])) as FeatureFlags;

const defaultExperience = (tenantId: string): TenantExperience => ({
  tenantId,
  flags: allEnabled(),
  branding: {
    systemName: 'Synapse',
    legalName: 'Synapse',
    logoUrl: null,
    faviconUrl: null,
    primaryColor: '#2563eb',
    secondaryColor: '#4f46e5',
    theme: 'system',
  },
});

@Injectable()
export class FeatureService {
  constructor(
    private readonly features: FeatureRepository,
    private readonly subscriptions: SaasRepository,
  ) {}

  async get(tenantId: string): Promise<TenantExperience> {
    return (await this.features.find(tenantId)) ?? defaultExperience(tenantId);
  }

  async getForCurrentTenant(context: TenantContext): Promise<TenantExperience> {
    return this.get(context.tenantId);
  }

  async setFeature(context: TenantContext, tenantId: string, input: UpdateFeatureInput) {
    this.assertSuperAdmin(context);
    return this.features.mutate(tenantId, defaultExperience(tenantId), (current) => ({
      ...current,
      flags: { ...current.flags, [input.feature]: input.enabled },
    }));
  }

  async setBranding(context: TenantContext, tenantId: string, input: UpdateBrandingInput) {
    this.assertSuperAdmin(context);
    const subscription = await this.subscriptions.find(tenantId);
    if (!subscription) throw new NotFoundException('Empresa não encontrada');
    if (!['ENTERPRISE', 'CUSTOM'].includes(subscription.plan)) {
      throw new ForbiddenException('White-label disponível somente nos planos ENTERPRISE e CUSTOM');
    }
    return this.features.mutate(tenantId, defaultExperience(tenantId), (current) => ({
      ...current,
      branding: { ...current.branding, ...input },
    }));
  }

  async assertEnabled(tenantId: string, feature: FeatureKey): Promise<void> {
    const subscription = await this.subscriptions.find(tenantId);
    if (subscription?.status === 'suspended') {
      throw new ForbiddenException('Empresa suspensa no SaaS');
    }
    if (!(await this.get(tenantId)).flags[feature]) {
      throw new ForbiddenException(`Módulo ${feature} está desabilitado para esta empresa`);
    }
  }

  private assertSuperAdmin(context: TenantContext): void {
    if (!context.roleIds.includes('SUPER_ADMIN_SAAS'))
      throw new ForbiddenException('Ação restrita ao SUPER_ADMIN_SAAS');
  }
}
