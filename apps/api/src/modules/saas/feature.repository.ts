import { Injectable } from '@nestjs/common';
import type { TenantExperience } from './feature.types';

@Injectable()
export class FeatureRepository {
  private readonly values = new Map<string, TenantExperience>();
  find(tenantId: string): TenantExperience | undefined {
    return this.values.get(tenantId);
  }
  save(value: TenantExperience): TenantExperience {
    this.values.set(value.tenantId, value);
    return value;
  }
}
