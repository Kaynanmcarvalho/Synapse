import { Injectable } from '@nestjs/common';
import type { Order } from '@synapse/types';
import { TenantSearchIndex } from '../../../common/search/tenant-search-index';

@Injectable()
export class OrderRepository {
  readonly searchIndex = new TenantSearchIndex<Order>();
  private readonly values = new Map<string, Order>();
  save(value: Order) {
    this.searchIndex.put(
      value,
      `${value.id} ${value.customerId} ${value.items.map((item) => item.description).join(' ')}`,
    );
    this.values.set(value.id, value);
    return value;
  }
  find(id: string) {
    return this.values.get(id);
  }
  listByTenant(tenantId: string): Order[] {
    return [...this.values.values()].filter((order) => order.tenantId === tenantId);
  }
}
