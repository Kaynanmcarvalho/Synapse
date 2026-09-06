import { Injectable } from '@nestjs/common';
import type { Branch } from '@synapse/types';

@Injectable()
export class BranchRepository {
  private readonly branches = new Map<string, Branch>();

  private key(tenantId: string, id: string): string {
    return `${tenantId}:${id}`;
  }

  save(branch: Branch): Branch {
    this.branches.set(this.key(branch.tenantId, branch.id), branch);
    return branch;
  }

  findById(tenantId: string, id: string): Branch | undefined {
    return this.branches.get(this.key(tenantId, id));
  }

  listByTenant(tenantId: string): Branch[] {
    return [...this.branches.values()].filter((branch) => branch.tenantId === tenantId);
  }

  delete(tenantId: string, id: string): void {
    this.branches.delete(this.key(tenantId, id));
  }
}
