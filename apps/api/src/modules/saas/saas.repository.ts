import { Injectable } from '@nestjs/common';
import type { TenantSubscription } from './saas.types';

@Injectable()
export class SaasRepository {
  private readonly subscriptions = new Map<string, TenantSubscription>();

  save(subscription: TenantSubscription): TenantSubscription {
    this.subscriptions.set(subscription.tenantId, subscription);
    return subscription;
  }

  find(tenantId: string): TenantSubscription | undefined {
    return this.subscriptions.get(tenantId);
  }

  list(): readonly TenantSubscription[] {
    return [...this.subscriptions.values()].sort((a, b) => a.name.localeCompare(b.name));
  }
}
