import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import type { AuditActor, Customer, CustomerHistoryEntry, Supplier } from '@synapse/types';
import type { CustomerInput, SupplierInput } from '@synapse/validation';
import { randomUUID } from 'node:crypto';
import type { TenantContext } from '../../iam/iam.types';
import { PartnerRepository } from '../repositories/partner.repository';

@Injectable()
export class PartnerService {
  constructor(private readonly repository: PartnerRepository) {}
  createCustomer(context: TenantContext, input: CustomerInput): Customer {
    const now = new Date().toISOString();
    const actor = this.actor(context);
    return this.repository.saveCustomer({
      ...input,
      id: randomUUID() as Customer['id'],
      tenantId: context.tenantId as Customer['tenantId'],
      openCredit: 0,
      financialStatus: 'REGULAR',
      responsibleSellerId: input.responsibleSellerId as Customer['responsibleSellerId'],
      priceTableId: input.priceTableId as Customer['priceTableId'],
      createdAt: now,
      createdBy: actor,
      updatedAt: now,
      updatedBy: actor,
      version: 1,
    });
  }
  createSupplier(context: TenantContext, input: SupplierInput): Supplier {
    const now = new Date().toISOString();
    const actor = this.actor(context);
    return this.repository.saveSupplier({
      ...input,
      id: randomUUID() as Supplier['id'],
      tenantId: context.tenantId as Supplier['tenantId'],
      productIds: input.productIds as unknown as Supplier['productIds'],
      createdAt: now,
      createdBy: actor,
      updatedAt: now,
      updatedBy: actor,
      version: 1,
    });
  }
  assertCredit(tenantId: string, customerId: string, saleAmount: number) {
    const customer = this.repository.findCustomer(tenantId, customerId);
    if (!customer) throw new NotFoundException('Cliente não encontrado');
    if (customer.financialStatus !== 'REGULAR')
      throw new BadRequestException('Cliente bloqueado por inadimplência');
    if (customer.openCredit + saleAmount > customer.creditLimit)
      throw new BadRequestException('Limite de crédito excedido');
    return customer;
  }
  setFinancialStatus(tenantId: string, customerId: string, status: Customer['financialStatus']) {
    const customer = this.repository.findCustomer(tenantId, customerId);
    if (!customer) throw new NotFoundException('Cliente não encontrado');
    return this.repository.updateCustomer({
      ...customer,
      financialStatus: status,
      version: customer.version + 1,
      updatedAt: new Date().toISOString(),
    });
  }
  addHistory(customerId: string, entry: Omit<CustomerHistoryEntry, 'id' | 'customerId'>) {
    this.repository.addHistory({
      ...entry,
      id: randomUUID(),
      customerId: customerId as CustomerHistoryEntry['customerId'],
    });
  }
  history(customerId: string) {
    return this.repository.customerHistory(customerId);
  }
  searchCustomers(tenantId: string, term: string) {
    return this.repository.searchCustomers(tenantId, term);
  }
  searchSuppliers(tenantId: string, term: string) {
    return this.repository.searchSuppliers(tenantId, term);
  }
  private actor(context: TenantContext): AuditActor {
    return { uid: context.userId as AuditActor['uid'], email: '', name: '', source: 'api' };
  }
}
