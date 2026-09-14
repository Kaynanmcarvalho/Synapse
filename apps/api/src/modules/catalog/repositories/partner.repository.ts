import { Injectable } from '@nestjs/common';
import type { Customer, CustomerHistoryEntry } from '@synapse/types';
import { cursorPage } from '../../../common/pagination/cursor-page';
import { TenantSearchIndex } from '../../../common/search/tenant-search-index';

@Injectable()
export class PartnerRepository {
  readonly customerIndex = new TenantSearchIndex<Customer>();
  private readonly customers = new Map<string, Customer>();
  private readonly history: CustomerHistoryEntry[] = [];
  saveCustomer(value: Customer) {
    this.customerIndex.put(value, `${value.name} ${value.taxId} ${value.phone}`);
    this.customers.set(`${value.tenantId}:${value.id}`, value);
    return value;
  }
  findCustomer(tenantId: string, id: string) {
    return this.customers.get(`${tenantId}:${id}`);
  }
  updateCustomer(customer: Customer) {
    return this.saveCustomer(customer);
  }
  searchCustomers(tenantId: string, term: string, limit: number, cursor?: string) {
    const raw = term.toLocaleLowerCase('pt-BR');
    const query = raw.replace(/\D/g, '') || raw;
    const matches = [...this.customers.values()].filter(
      (item) =>
        item.tenantId === tenantId &&
        [item.taxId, item.name.toLocaleLowerCase('pt-BR'), item.phone].some((field) =>
          field.includes(query),
        ),
    );
    return cursorPage(matches, limit, cursor);
  }
  /** Todos os clientes do tenant, sem paginar: para agregacao interna
   *  (carteira do vendedor, indicadores), nunca para resposta de API. */
  listCustomers(tenantId: string): Customer[] {
    return [...this.customers.values()].filter((item) => item.tenantId === tenantId);
  }
  addHistory(entry: CustomerHistoryEntry) {
    this.history.push(entry);
  }
  customerHistory(customerId: string, limit: number, cursor?: string) {
    return cursorPage(
      this.history
        .filter((entry) => entry.customerId === customerId)
        .sort((a, b) => b.occurredAt.localeCompare(a.occurredAt)),
      limit,
      cursor,
    );
  }
}
