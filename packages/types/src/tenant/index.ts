import type { AuditStamp, BranchId, TenantId, UserId } from '../common';

export type TenantStatus = 'trial' | 'active' | 'suspended' | 'cancelled';

export interface Tenant extends AuditStamp {
  readonly id: TenantId;
  readonly name: string;
  readonly document: string;
  readonly status: TenantStatus;
}

export interface Branch extends AuditStamp {
  readonly id: BranchId;
  readonly tenantId: TenantId;
  readonly name: string;
  readonly isHeadquarters: boolean;
}

export interface Membership {
  readonly userId: UserId;
  readonly tenantId: TenantId;
  readonly branchIds: readonly BranchId[];
  readonly roleIds: readonly string[];
}
