import { Injectable } from '@nestjs/common';
import type { Customer, CustomerHistoryEntry, Supplier } from '@synapse/types';
import { cursorPage } from '../../../common/pagination/cursor-page';
import { TenantSearchIndex } from '../../../common/search/tenant-search-index';

@Injectable()
export class PartnerRepository {
  readonly customerIndex = new TenantSearchIndex<Customer>();
  readonly supplierIndex = new TenantSearchIndex<Supplier>();
  private readonly customers = new Map<string, Customer>();
  private readonly suppliers = new Map<string, Supplier>();
  private readonly history: CustomerHistoryEntry[] = [];
  saveCustomer(value: Customer) {
    this.customerIndex.put(value, `${value.name} ${value.taxId} ${value.phone}`);
    this.customers.set(`${value.tenantId}:${value.id}`, value);
    return value;
  }
  saveSupplier(value: Supplier) {
    this.supplierIndex.put(value, `${value.tradeName} ${value.legalName} ${value.taxId}`);
    this.suppliers.set(`${value.tenantId}:${value.id}`, value);
    return value;
  }
  findCustomer(tenantId: string, id: string) {
    return this.customers.get(`${tenantId}:${id}`);
  }
  findSupplier(tenantId: string, id: string) {
    return this.suppliers.get(`${tenantId}:${id}`);
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
  searchSuppliers(tenantId: string, term: string, limit: number, cursor?: string) {
    const query = term.toLocaleLowerCase('pt-BR');
    const matches = [...this.suppliers.values()].filter(
      (item) =>
        item.tenantId === tenantId &&
        [
          item.taxId,
          item.legalName.toLocaleLowerCase('pt-BR'),
          item.tradeName.toLocaleLowerCase('pt-BR'),
          ...item.contacts.map((contact) => contact.phone),
        ].some((field) => field.includes(query)),
    );
    return cursorPage(matches, limit, cursor);
  }
  /** Todos os clientes do tenant, sem paginar: para agregacao interna
   *  (carteira do vendedor, indicadores), nunca para resposta de API. */
  listCustomers(tenantId: string): Customer[] {
    return [...this.customers.values()].filter((item) => item.tenantId === tenantId);
  }
  listSuppliers(tenantId: string): Supplier[] {
    return [...this.suppliers.values()].filter((item) => item.tenantId === tenantId);
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
