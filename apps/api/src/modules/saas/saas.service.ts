import {
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import type { TenantContext } from '../iam/iam.types';
import type {
  ConsumeResourceInput,
  CreateTenantSubscriptionInput,
  UpdateTenantSubscriptionInput,
} from './dto/saas.schemas';
import { SaasRepository } from './saas.repository';
import {
  BILLABLE_RESOURCES,
  type PlanCode,
  type ResourceConsumption,
  type ResourceValues,
  type TenantSubscription,
} from './saas.types';

const PLAN_LIMITS: Record<Exclude<PlanCode, 'CUSTOM'>, ResourceValues> = {
  BASIC: {
    users: 5,
    branches: 1,
    products: 2_000,
    fiscalDocuments: 1_000,
    storageMb: 1_024,
    sellers: 3,
  },
  PROFESSIONAL: {
    users: 30,
    branches: 5,
    products: 20_000,
    fiscalDocuments: 10_000,
    storageMb: 10_240,
    sellers: 20,
  },
  ENTERPRISE: {
    users: 200,
    branches: 50,
    products: 200_000,
    fiscalDocuments: 100_000,
    storageMb: 102_400,
    sellers: 150,
  },
};
const EMPTY_USAGE: ResourceValues = {
  users: 0,
  branches: 0,
  products: 0,
  fiscalDocuments: 0,
  storageMb: 0,
  sellers: 0,
};

@Injectable()
export class SaasService {
  constructor(private readonly repository: SaasRepository) {}

  create(context: TenantContext, input: CreateTenantSubscriptionInput): TenantSubscription {
    this.assertSuperAdmin(context);
    if (this.repository.find(input.tenantId)) throw new ConflictException('Empresa já cadastrada');
    const now = new Date().toISOString();
    return this.repository.save({
      tenantId: input.tenantId,
      name: input.name,
      document: input.document,
      status: 'trial',
      plan: input.plan,
      limits: this.resolveLimits(input.plan, input.limits),
      usage: { ...EMPTY_USAGE },
      createdAt: now,
      updatedAt: now,
    });
  }

  list(context: TenantContext) {
    this.assertSuperAdmin(context);
    return this.repository.list().map((tenant) => ({
      ...tenant,
      consumption: this.consumption(tenant),
    }));
  }

  update(context: TenantContext, tenantId: string, input: UpdateTenantSubscriptionInput) {
    this.assertSuperAdmin(context);
    const current = this.required(tenantId);
    const plan = input.plan ?? current.plan;
    return this.repository.save({
      ...current,
      ...input,
      plan,
      limits: input.limits ? this.resolveLimits(plan, input.limits) : current.limits,
      updatedAt: new Date().toISOString(),
    });
  }

  consume(context: TenantContext, tenantId: string, input: ConsumeResourceInput) {
    this.assertSuperAdmin(context);
    const current = this.required(tenantId);
    if (current.status === 'suspended') {
      throw new ForbiddenException('Empresa suspensa. Reative-a antes de registrar consumo.');
    }
    const used = Math.max(0, current.usage[input.resource] + input.delta);
    const limit = current.limits[input.resource];
    if (used > limit) {
      throw new ConflictException(
        `Limite de ${input.resource} excedido: ${current.usage[input.resource]}/${limit}. ` +
          'Altere o plano ou o limite antes de continuar.',
      );
    }
    const saved = this.repository.save({
      ...current,
      usage: { ...current.usage, [input.resource]: used },
      updatedAt: new Date().toISOString(),
    });
    return this.consumption(saved).find((item) => item.resource === input.resource);
  }

  metrics(context: TenantContext) {
    this.assertSuperAdmin(context);
    const tenants = this.repository.list();
    return {
      companies: tenants.length,
      activeCompanies: tenants.filter((item) => item.status === 'active').length,
      suspendedCompanies: tenants.filter((item) => item.status === 'suspended').length,
      users: tenants.reduce((total, item) => total + item.usage.users, 0),
      fiscalDocuments: tenants.reduce((total, item) => total + item.usage.fiscalDocuments, 0),
      storageMb: tenants.reduce((total, item) => total + item.usage.storageMb, 0),
      byPlan: Object.fromEntries(
        ['BASIC', 'PROFESSIONAL', 'ENTERPRISE', 'CUSTOM'].map((plan) => [
          plan,
          tenants.filter((item) => item.plan === plan).length,
        ]),
      ),
    };
  }

  private consumption(tenant: TenantSubscription): ResourceConsumption[] {
    return BILLABLE_RESOURCES.map((resource) => {
      const used = tenant.usage[resource];
      const limit = tenant.limits[resource];
      const percentage = Math.round((used / limit) * 10_000) / 100;
      return { resource, used, limit, percentage, warning: percentage >= 80 };
    });
  }

  private resolveLimits(plan: PlanCode, overrides?: Partial<ResourceValues>): ResourceValues {
    if (plan === 'CUSTOM' && !overrides) {
      throw new ConflictException('Plano CUSTOM exige limites personalizados');
    }
    const base = plan === 'CUSTOM' ? PLAN_LIMITS.ENTERPRISE : PLAN_LIMITS[plan];
    return { ...base, ...overrides };
  }

  private required(tenantId: string): TenantSubscription {
    const tenant = this.repository.find(tenantId);
    if (!tenant) throw new NotFoundException('Empresa não encontrada');
    return tenant;
  }

  private assertSuperAdmin(context: TenantContext): void {
    if (!context.roleIds.includes('SUPER_ADMIN_SAAS')) {
      throw new ForbiddenException('Ação restrita ao SUPER_ADMIN_SAAS');
    }
  }
}
