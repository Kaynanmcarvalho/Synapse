import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  asProductId,
  type CashMovement,
  type CashSession,
  type PosItem,
  type PosSale,
} from '@synapse/types';
import { randomUUID } from 'node:crypto';
import type { TenantContext } from '../../iam/iam.types';
import type { CashMovementInput, CompletePosSaleInput } from '../dto/pos.schemas';
import { CashSessionRepository } from '../repositories/cash-session.repository';

export interface PosFiscalIssuer {
  issueNfce(
    tenantId: string,
    companyId: string,
    sale: Omit<PosSale, 'nfceDocumentId'>,
  ): Promise<string>;
}

@Injectable()
export class PosService {
  constructor(private readonly repository: CashSessionRepository) {}

  openCash(context: TenantContext, branchId: string, openingAmount: number): CashSession {
    return this.repository.save({
      id: randomUUID(),
      tenantId: context.tenantId as CashSession['tenantId'],
      branchId: branchId as CashSession['branchId'],
      operatorId: context.userId,
      openedAt: new Date().toISOString(),
      closedAt: null,
      openingAmount,
      expectedCash: openingAmount,
      countedCash: null,
      difference: null,
      movements: [],
    });
  }

  addMovement(
    sessionId: string,
    type: 'SUPPLY' | 'WITHDRAWAL',
    input: CashMovementInput,
    operatorId: string,
  ): CashSession {
    const session = this.openSession(sessionId);
    const movement: CashMovement = {
      id: randomUUID(),
      type,
      amount: input.amount,
      reason: input.reason,
      occurredAt: new Date().toISOString(),
      operatorId,
    };
    const expectedCash = session.expectedCash + (type === 'SUPPLY' ? input.amount : -input.amount);
    if (expectedCash < 0)
      throw new BadRequestException('Sangria excede o saldo esperado em dinheiro');
    return this.repository.save({
      ...session,
      expectedCash,
      movements: [...session.movements, movement],
    });
  }

  async completeSale(
    sessionId: string,
    input: CompletePosSaleInput,
    fiscal: PosFiscalIssuer,
  ): Promise<PosSale> {
    const session = this.openSession(sessionId);
    const items: PosItem[] = input.items.map((item) => ({
      ...item,
      productId: asProductId(item.productId),
      barcode: item.barcode ?? null,
      total: Math.round((item.quantity * item.unitPrice) / 1000) - item.discount + item.surcharge,
    }));
    const subtotal = items.reduce(
      (sum, item) => sum + Math.round((item.quantity * item.unitPrice) / 1000),
      0,
    );
    const discount = items.reduce((sum, item) => sum + item.discount, 0);
    const surcharge = items.reduce((sum, item) => sum + item.surcharge, 0);
    const total = subtotal - discount + surcharge;
    if (discount * 10_000 > subtotal * input.operatorDiscountLimitBasisPoints)
      throw new BadRequestException('Desconto excede o limite do operador');
    if (input.payments.reduce((sum, payment) => sum + payment.amount, 0) !== total)
      throw new BadRequestException('A soma dos pagamentos deve ser igual ao total da venda');
    const draft = {
      id: randomUUID(),
      cashSessionId: session.id,
      customerId: (input.customerId ?? null) as PosSale['customerId'],
      customerTaxId: input.customerTaxId ?? null,
      sellerId: input.sellerId,
      items,
      payments: input.payments.map((p) => ({ ...p, reference: p.reference ?? null })),
      subtotal,
      discount,
      surcharge,
      total,
      completedAt: new Date().toISOString(),
    };
    const sale = this.repository.saveSale({
      ...draft,
      nfceDocumentId: await fiscal.issueNfce(session.tenantId, input.companyId, draft),
    });
    const cashReceived = sale.payments
      .filter((p) => p.method === 'CASH')
      .reduce((sum, p) => sum + p.amount, 0);
    this.repository.save({ ...session, expectedCash: session.expectedCash + cashReceived });
    return sale;
  }

  closeCash(sessionId: string, countedCash: number): CashSession {
    const session = this.openSession(sessionId);
    return this.repository.save({
      ...session,
      closedAt: new Date().toISOString(),
      countedCash,
      difference: countedCash - session.expectedCash,
    });
  }

  reprintSale(saleId: string): PosSale {
    const sale = this.repository.findSale(saleId);
    if (!sale) throw new NotFoundException('Venda não encontrada');
    return sale;
  }

  private openSession(id: string): CashSession {
    const session = this.repository.find(id);
    if (!session) throw new NotFoundException('Caixa não encontrado');
    if (session.closedAt) throw new ConflictException('Caixa já fechado');
    return session;
  }
}
