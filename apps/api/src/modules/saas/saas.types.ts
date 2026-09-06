export const PLAN_CODES = ['BASIC', 'PROFESSIONAL', 'ENTERPRISE', 'CUSTOM'] as const;
export type PlanCode = (typeof PLAN_CODES)[number];

export const BILLABLE_RESOURCES = [
  'users',
  'branches',
  'products',
  'fiscalDocuments',
  'storageMb',
  'sellers',
] as const;
export type BillableResource = (typeof BILLABLE_RESOURCES)[number];
export type ResourceValues = Record<BillableResource, number>;

export interface TenantSubscription {
  readonly tenantId: string;
  readonly name: string;
  readonly document: string;
  readonly status: 'trial' | 'active' | 'suspended';
  readonly plan: PlanCode;
  readonly limits: ResourceValues;
  readonly usage: ResourceValues;
  readonly createdAt: string;
  readonly updatedAt: string;
}

export interface ResourceConsumption {
  readonly resource: BillableResource;
  readonly used: number;
  readonly limit: number;
  readonly percentage: number;
  readonly warning: boolean;
}
