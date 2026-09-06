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

@Injectable()
export class FeatureService {
  constructor(
    private readonly features: FeatureRepository,
    private readonly subscriptions: SaasRepository,
  ) {}

  get(tenantId: string): TenantExperience {
    return (
      this.features.find(tenantId) ?? {
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
      }
    );
  }

  getForCurrentTenant(context: TenantContext): TenantExperience {
    return this.get(context.tenantId);
  }

  setFeature(context: TenantContext, tenantId: string, input: UpdateFeatureInput) {
    this.assertSuperAdmin(context);
    const current = this.get(tenantId);
    return this.features.save({
      ...current,
      flags: { ...current.flags, [input.feature]: input.enabled },
    });
  }

  setBranding(context: TenantContext, tenantId: string, input: UpdateBrandingInput) {
    this.assertSuperAdmin(context);
    const subscription = this.subscriptions.find(tenantId);
    if (!subscription) throw new NotFoundException('Empresa não encontrada');
    if (!['ENTERPRISE', 'CUSTOM'].includes(subscription.plan)) {
      throw new ForbiddenException('White-label disponível somente nos planos ENTERPRISE e CUSTOM');
    }
    const current = this.get(tenantId);
    return this.features.save({ ...current, branding: { ...current.branding, ...input } });
  }

  assertEnabled(tenantId: string, feature: FeatureKey): void {
    if (!this.get(tenantId).flags[feature]) {
      throw new ForbiddenException(`Módulo ${feature} está desabilitado para esta empresa`);
    }
  }

  private assertSuperAdmin(context: TenantContext): void {
    if (!context.roleIds.includes('SUPER_ADMIN_SAAS'))
      throw new ForbiddenException('Ação restrita ao SUPER_ADMIN_SAAS');
  }
}
