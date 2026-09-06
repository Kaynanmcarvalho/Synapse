import { CacheService } from './cache.service';
import { HeavyJobQueue } from './heavy-job.queue';
import { MaterializedAggregateService } from './materialized-aggregate.service';

describe('infraestrutura de performance', () => {
  it('materializa agregado, usa cache e enfileira recomputação pesada', async () => {
    const cache = new CacheService();
    const jobs = new HeavyJobQueue();
    const aggregates = new MaterializedAggregateService(cache, jobs);
    aggregates.record('tenant', 'sales.total', 10);
    aggregates.record('tenant', 'sales.total', 5);
    await expect(aggregates.read('tenant', 'sales.total')).resolves.toMatchObject({ value: 15 });
    await expect(aggregates.refresh('tenant', 'sales.total')).resolves.toMatchObject({
      name: 'refresh-aggregate',
    });
    expect(jobs.pendingLocal()).toHaveLength(1);
  });
});
