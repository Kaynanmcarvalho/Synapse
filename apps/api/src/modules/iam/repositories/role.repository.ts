import { Injectable } from '@nestjs/common';
import type { Role } from '@synapse/types';

/** Cargos personalizados por tenant. Cargos de sistema nao vivem aqui — o
 *  conjunto fixo esta em permission-catalog.ts e nunca e persistido.
 *
 *  tenantId chega como string simples: e o TenantContext resolvido da sessao,
 *  nao a entidade Role, entao nao carrega a marca de tipo aqui. */
@Injectable()
export class RoleRepository {
  private readonly roles = new Map<string, Role>();

  private key(tenantId: string, id: string): string {
    return `${tenantId}:${id}`;
  }

  save(role: Role): Role {
    this.roles.set(this.key(role.tenantId, role.id), role);
    return role;
  }

  findById(tenantId: string, id: string): Role | undefined {
    return this.roles.get(this.key(tenantId, id));
  }

  listByTenant(tenantId: string): Role[] {
    return [...this.roles.values()].filter((role) => role.tenantId === tenantId);
  }

  delete(tenantId: string, id: string): void {
    this.roles.delete(this.key(tenantId, id));
  }
}
