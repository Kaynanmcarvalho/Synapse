import { Injectable, type OnModuleDestroy } from '@nestjs/common';
import { Queue } from 'bullmq';

export type HeavyJobName = 'refresh-aggregate' | 'export-report' | 'rebuild-search-index';
@Injectable()
export class HeavyJobQueue implements OnModuleDestroy {
  private queue: Queue | null = null;
  private readonly local: Array<{ name: HeavyJobName; data: Record<string, unknown> }> = [];

  async enqueue(name: HeavyJobName, data: Record<string, unknown>) {
    const url = process.env.REDIS_URL;
    if (!url) {
      const job = { name, data };
      this.local.push(job);
      return { id: `local-${this.local.length}`, ...job };
    }
    this.queue ??= new Queue('synapse-heavy-jobs', { connection: this.connection(url) });
    return this.queue.add(name, data, {
      attempts: 5,
      backoff: { type: 'exponential', delay: 1_000 },
      removeOnComplete: 1_000,
      removeOnFail: 5_000,
    });
  }

  pendingLocal() {
    return [...this.local];
  }
  async onModuleDestroy(): Promise<void> {
    if (this.queue) await this.queue.close();
  }

  private connection(value: string) {
    const url = new URL(value);
    return {
      host: url.hostname,
      port: Number(url.port || 6379),
      username: url.username || undefined,
      password: url.password || undefined,
      ...(url.protocol === 'rediss:' ? { tls: {} } : {}),
    };
  }
}
