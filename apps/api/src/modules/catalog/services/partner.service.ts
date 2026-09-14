import { Injectable, NotFoundException } from '@nestjs/common';
import type { AuditActor, CustomerHistoryEntry, Supplier } from '@synapse/types';
import type { SupplierInput } from '@synapse/validation';
import { randomUUID } from 'node:crypto';
import type { TenantContext } from '../../iam/iam.types';
import { FornecedorRepository } from '../repositories/fornecedor.repository';
import { PartnerRepository } from '../repositories/partner.repository';

/** Fornecedores e o historico de atendimento do cliente.
 *
 *  O cadastro de clientes saiu daqui: vive no ClienteService, gravado no
 *  Firestore. Antes havia duas verdades sobre o mesmo cliente — este servico,
 *  em memoria, e o documento que a analise de credito lia. */
@Injectable()
export class PartnerService {
  constructor(
    private readonly repository: PartnerRepository,
    private readonly fornecedores: FornecedorRepository,
  ) {}

  /** Rota antiga (catalog/partners/suppliers): grava no mesmo cadastro de
   *  fornecedores da tela, com o próximo código. */
  createSupplier(context: TenantContext, input: SupplierInput): Promise<Supplier> {
    const now = new Date().toISOString();
    const actor = this.actor(context);
    return this.fornecedores.criar({
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

  async getSupplier(tenantId: string, supplierId: string): Promise<Supplier> {
    const supplier = await this.fornecedores.buscar(tenantId, supplierId);
    if (!supplier) throw new NotFoundException('Fornecedor nao encontrado');
    return supplier;
  }

  async searchSuppliers(tenantId: string, term: string, limit = 50) {
    const items = await this.fornecedores.procurar(tenantId, term, limit);
    return { items, nextCursor: null, hasMore: false };
  }

  listSuppliers(tenantId: string): Promise<Supplier[]> {
    return this.fornecedores.todos(tenantId);
  }

  /** Atendimento registrado do cliente (ligacao, visita, ocorrencia). Hoje so a
   *  exportacao da LGPD le isto, e nenhum fluxo grava: a lista vem vazia. */
  addHistory(customerId: string, entry: Omit<CustomerHistoryEntry, 'id' | 'customerId'>) {
    this.repository.addHistory({
      ...entry,
      id: randomUUID(),
      customerId: customerId as CustomerHistoryEntry['customerId'],
    });
  }

  history(customerId: string, limit = 50, cursor?: string) {
    return this.repository.customerHistory(customerId, limit, cursor);
  }

  private actor(context: TenantContext): AuditActor {
    return { uid: context.userId as AuditActor['uid'], email: '', name: '', source: 'api' };
  }
}
