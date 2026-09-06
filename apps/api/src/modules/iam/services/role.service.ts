import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  asRoleId,
  SYSTEM_ROLE_KEYS,
  type AuditActor,
  type Permission,
  type PermissionGrant,
  type Role,
  type SystemRoleKey,
} from '@synapse/types';
import type { CreateRoleInput, UpdateRoleInput } from '@synapse/validation';
import { randomUUID } from 'node:crypto';
import type { TenantContext } from '../iam.types';
import { DEFAULT_ROLE_PERMISSIONS } from '../permission-catalog';
import { RoleRepository } from '../repositories/role.repository';

const SYSTEM_ROLE_SET = new Set<string>(SYSTEM_ROLE_KEYS);

const isSystemRoleKey = (value: string): value is SystemRoleKey => SYSTEM_ROLE_SET.has(value);

export interface RoleView {
  readonly id: string;
  readonly name: string;
  readonly systemKey: SystemRoleKey | null;
  readonly isCustom: boolean;
  readonly permissions: readonly PermissionGrant[];
}

@Injectable()
export class RoleService {
  constructor(private readonly repository: RoleRepository) {}

  /** As oito roles padrao, na ordem do §3, seguidas dos cargos personalizados do tenant. */
  list(tenant: TenantContext): RoleView[] {
    const defaults: RoleView[] = SYSTEM_ROLE_KEYS.map((key) => ({
      id: key,
      name: key,
      systemKey: key,
      isCustom: false,
      permissions: DEFAULT_ROLE_PERMISSIONS[key],
    }));
    const custom = this.repository.listByTenant(tenant.tenantId).map((role) => this.toView(role));
    return [...defaults, ...custom];
  }

  create(tenant: TenantContext, input: CreateRoleInput): RoleView {
    const now = new Date().toISOString();
    const actor = this.actor(tenant);
    const role: Role = {
      id: asRoleId(randomUUID()),
      tenantId: tenant.tenantId as Role['tenantId'],
      name: input.name,
      systemKey: null,
      isCustom: true,
      permissions: input.permissions as readonly PermissionGrant[],
      createdAt: now,
      createdBy: actor,
      updatedAt: now,
      updatedBy: actor,
      version: 1,
    };
    return this.toView(this.repository.save(role));
  }

  update(tenant: TenantContext, roleId: string, input: UpdateRoleInput): RoleView {
    if (isSystemRoleKey(roleId)) {
      throw new BadRequestException(
        'Cargos padrao nao podem ser editados, apenas os personalizados',
      );
    }
    const role = this.repository.findById(tenant.tenantId, roleId);
    if (!role) throw new NotFoundException('Cargo nao encontrado');

    const updated: Role = {
      ...role,
      name: input.name ?? role.name,
      permissions:
        (input.permissions as readonly PermissionGrant[] | undefined) ?? role.permissions,
      updatedAt: new Date().toISOString(),
      updatedBy: this.actor(tenant),
      version: role.version + 1,
    };
    return this.toView(this.repository.save(updated));
  }

  remove(tenant: TenantContext, roleId: string): void {
    if (isSystemRoleKey(roleId)) {
      throw new ConflictException('Cargos padrao nao podem ser excluidos');
    }
    const role = this.repository.findById(tenant.tenantId, roleId);
    if (!role) throw new NotFoundException('Cargo nao encontrado');
    this.repository.delete(tenant.tenantId, roleId);
  }

  /** Uniao das permissoes de todas as roles do usuario. Uma role de sistema
   *  resolve pelo catalogo fixo; qualquer outro id busca um cargo personalizado. */
  resolveGrants(tenant: TenantContext): PermissionGrant[] {
    return tenant.roleIds.flatMap((roleId) => {
      if (isSystemRoleKey(roleId)) return DEFAULT_ROLE_PERMISSIONS[roleId];
      const role = this.repository.findById(tenant.tenantId, roleId);
      return role ? role.permissions : [];
    });
  }

  /** Duas restricoes independentes, as duas precisam passar:
   *  - a do GRANT: sem `scope.branchIds` vale em qualquer filial; com escopo,
   *    so nas filiais listadas (o caso do "Supervisor Regional" do §3).
   *  - a do MEMBERSHIP: `tenant.branchIds` vazio significa usuario nao restrito
   *    a filial nenhuma — o caso do ADMIN_EMPRESA que fecha a empresa toda.
   *    Uma lista preenchida restringe as filiais em que o usuario atua. */
  hasPermission(tenant: TenantContext, permission: Permission, branchId?: string): boolean {
    const grants = this.resolveGrants(tenant);
    return grants.some((grant) => {
      if (grant.permission !== permission) return false;
      if (!branchId) return true;
      if (grant.scope?.branchIds && !grant.scope.branchIds.includes(branchId)) return false;
      if (tenant.branchIds.length > 0 && !tenant.branchIds.includes(branchId)) return false;
      return true;
    });
  }

  private toView(role: Role): RoleView {
    return {
      id: role.id,
      name: role.name,
      systemKey: role.systemKey,
      isCustom: role.isCustom,
      permissions: role.permissions,
    };
  }

  private actor(tenant: TenantContext): AuditActor {
    return { uid: tenant.userId as AuditActor['uid'], email: '', name: '', source: 'api' };
  }
}
