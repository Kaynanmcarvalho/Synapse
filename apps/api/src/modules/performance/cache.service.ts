import { Injectable, Logger, type OnModuleDestroy } from '@nestjs/common';
import Redis from 'ioredis';

@Injectable()
export class CacheService implements OnModuleDestroy {
  private readonly logger = new Logger(CacheService.name);
  private readonly redis = process.env.REDIS_URL
    ? new Redis(process.env.REDIS_URL, {
        lazyConnect: true,
        maxRetriesPerRequest: 1,
        enableOfflineQueue: false,
      })
    : null;
  private readonly memory = new Map<string, { value: string; expiresAt: number }>();

  async getOrSet<T>(key: string, ttlSeconds: number, load: () => Promise<T>): Promise<T> {
    const cached = await this.get(key);
    if (cached !== null) return JSON.parse(cached) as T;
    const value = await load();
    await this.set(key, JSON.stringify(value), ttlSeconds);
    return value;
  }

  private async get(key: string): Promise<string | null> {
    if (this.redis) {
      try {
        return await this.redis.get(key);
      } catch (error) {
        this.logger.warn(
          `Redis indisponível; usando fallback local: ${error instanceof Error ? error.message : error}`,
        );
      }
    }
    const value = this.memory.get(key);
    if (!value || value.expiresAt <= Date.now()) {
      this.memory.delete(key);
      return null;
    }
    return value.value;
  }

  private async set(key: string, value: string, ttlSeconds: number): Promise<void> {
    if (this.redis) {
      try {
        await this.redis.set(key, value, 'EX', ttlSeconds);
        return;
      } catch {
        /* fallback abaixo */
      }
    }
    this.memory.set(key, { value, expiresAt: Date.now() + ttlSeconds * 1_000 });
  }

  async onModuleDestroy(): Promise<void> {
    if (this.redis) await this.redis.quit().catch(() => undefined);
  }
}
