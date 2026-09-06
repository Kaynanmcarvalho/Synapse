import { Injectable } from '@nestjs/common';
import type { Order } from '@synapse/types';

@Injectable()
export class OrderRepository {
  private readonly values = new Map<string, Order>();
  save(value: Order) {
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
