import { Injectable } from '@nestjs/common';
import type { Customer, CustomerHistoryEntry, Supplier } from '@synapse/types';

@Injectable()
export class PartnerRepository {
  private readonly customers = new Map<string, Customer>();
  private readonly suppliers = new Map<string, Supplier>();
  private readonly history: CustomerHistoryEntry[] = [];
  saveCustomer(value: Customer) {
    this.customers.set(`${value.tenantId}:${value.id}`, value);
    return value;
  }
  saveSupplier(value: Supplier) {
    this.suppliers.set(`${value.tenantId}:${value.id}`, value);
    return value;
  }
  findCustomer(tenantId: string, id: string) {
    return this.customers.get(`${tenantId}:${id}`);
  }
  updateCustomer(customer: Customer) {
    return this.saveCustomer(customer);
  }
  searchCustomers(tenantId: string, term: string) {
    const raw = term.toLocaleLowerCase('pt-BR');
    const query = raw.replace(/\D/g, '') || raw;
    return [...this.customers.values()].filter(
      (item) =>
        item.tenantId === tenantId &&
        [item.taxId, item.name.toLocaleLowerCase('pt-BR'), item.phone].some((field) =>
          field.includes(query),
        ),
    );
  }
  searchSuppliers(tenantId: string, term: string) {
    const query = term.toLocaleLowerCase('pt-BR');
    return [...this.suppliers.values()].filter(
      (item) =>
        item.tenantId === tenantId &&
        [
          item.taxId,
          item.legalName.toLocaleLowerCase('pt-BR'),
          item.tradeName.toLocaleLowerCase('pt-BR'),
          ...item.contacts.map((contact) => contact.phone),
        ].some((field) => field.includes(query)),
    );
  }
  addHistory(entry: CustomerHistoryEntry) {
    this.history.push(entry);
  }
  customerHistory(customerId: string) {
    return this.history
      .filter((entry) => entry.customerId === customerId)
      .sort((a, b) => b.occurredAt.localeCompare(a.occurredAt));
  }
}
