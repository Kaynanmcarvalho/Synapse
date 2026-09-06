import type { TenantId, UserId } from './branded';

export type AuditSource = 'user' | 'api' | 'mcp' | 'system';

export interface AuditActor {
  readonly uid: UserId;
  readonly email: string;
  readonly name: string;
  readonly source: AuditSource;
}

export interface AuditStamp {
  readonly tenantId: TenantId;
  readonly createdAt: string;
  readonly createdBy: AuditActor;
  readonly updatedAt: string;
  readonly updatedBy: AuditActor;
  readonly version: number;
}
