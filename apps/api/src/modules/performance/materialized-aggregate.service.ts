import { Injectable } from '@nestjs/common';
import { CacheService } from './cache.service';
import { HeavyJobQueue } from './heavy-job.queue';

export interface Aggregate {
  readonly tenantId: string;
  readonly metric: string;
  readonly value: number;
  readonly updatedAt: string;
}
@Injectable()
export class MaterializedAggregateService {
  private readonly values = new Map<string, Aggregate>();
  constructor(
    private readonly cache: CacheService,
    private readonly jobs: HeavyJobQueue,
  ) {}
  record(tenantId: string, metric: string, delta: number): Aggregate {
    const key = `${tenantId}:${metric}`;
    const current = this.values.get(key);
    const value = {
      tenantId,
      metric,
      value: (current?.value ?? 0) + delta,
      updatedAt: new Date().toISOString(),
    };
    this.values.set(key, value);
    return value;
  }
  read(tenantId: string, metric: string) {
    return this.cache.getOrSet(
      `aggregate:${tenantId}:${metric}`,
      30,
      async () =>
        this.values.get(`${tenantId}:${metric}`) ?? {
          tenantId,
          metric,
          value: 0,
          updatedAt: new Date(0).toISOString(),
        },
    );
  }
  refresh(tenantId: string, metric: string) {
    return this.jobs.enqueue('refresh-aggregate', { tenantId, metric });
  }
}
