import { Injectable } from '@nestjs/common';
import type { ConfigEntry } from '@synapse/types';

@Injectable()
export class ConfigRepository {
  private readonly entries = new Map<string, ConfigEntry>();

  private key(tenantId: string, branchId: string | null, configKey: string): string {
    return `${tenantId}:${branchId ?? '_global'}:${configKey}`;
  }

  get(tenantId: string, branchId: string | null, configKey: string): ConfigEntry | undefined {
    return this.entries.get(this.key(tenantId, branchId, configKey));
  }

  set(entry: ConfigEntry): ConfigEntry {
    this.entries.set(this.key(entry.tenantId, entry.branchId, entry.key), entry);
    return entry;
  }

  clear(tenantId: string, branchId: string | null, configKey: string): void {
    this.entries.delete(this.key(tenantId, branchId, configKey));
  }
}
