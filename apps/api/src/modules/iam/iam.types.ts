import type { DecodedIdToken } from '@synapse/firebase/admin';
import type { Request } from 'express';

export interface TenantContext {
  readonly tenantId: string;
  readonly userId: string;
  readonly roleIds: readonly string[];
  readonly branchIds: readonly string[];
  readonly warehouseIds: readonly string[];
}

export interface AuthenticatedRequest extends Request {
  auth?: DecodedIdToken;
  tenant?: TenantContext;
}

export interface MembershipRecord {
  readonly authUid: string;
  readonly status: 'active' | 'blocked';
  readonly roleIds: readonly string[];
  readonly branchIds: readonly string[];
  readonly warehouseIds: readonly string[];
  readonly mfaRequired: boolean;
}
