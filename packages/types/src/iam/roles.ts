import type { AuditStamp, RoleId, TenantId, UserId } from '../common';
import type { PermissionGrant } from './permissions';

/** Roles padrao do sistema (§3). PERSONALIZADO marca um cargo criado pelo cliente. */
export const SYSTEM_ROLE_KEYS = [
  'SUPER_ADMIN_SAAS',
  'ADMIN_EMPRESA',
  'ADMIN_FILIAL',
  'GERENTE',
  'VENDEDOR',
  'CAIXA',
  'ESTOQUE',
  'FINANCEIRO',
] as const;

export type SystemRoleKey = (typeof SYSTEM_ROLE_KEYS)[number];

export interface Role extends AuditStamp {
  readonly id: RoleId;
  readonly tenantId: TenantId;
  readonly name: string;
  readonly systemKey: SystemRoleKey | null;
  readonly isCustom: boolean;
  readonly permissions: readonly PermissionGrant[];
}

export interface RoleAssignment {
  readonly userId: UserId;
  readonly tenantId: TenantId;
  readonly roleId: RoleId;
}
