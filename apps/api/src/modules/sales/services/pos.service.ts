import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import type { CashMovement, CashSession, PosSale } from '@synapse/types';
import { randomUUID } from 'node:crypto';
import type { TenantContext } from '../../iam/iam.types';
import type { CashMovementInput } from '../dto/pos.schemas';
import { CashSessionRepository } from '../repositories/cash-session.repository';

export interface PosFiscalIssuer {
  issueNfce(
    tenantId: string,
    companyId: string,
    sale: Omit<PosSale, 'nfceDocumentId'>,
  ): Promise<string>;
}

/** O caixa do PDV: abrir, suprimento, sangria e fechamento. A venda em si mora
 *  em `VendaDoPdvService`. Um operador tem um caixa aberto por filial. */
@Injectable()
export class PosService {
  constructor(private readonly repository: CashSessionRepository) {}

  async getCurrentSession(context: TenantContext, branchId: string): Promise<CashSession | null> {
    return (
      (await this.repository.findOpenByOperator(context.tenantId, branchId, context.userId)) ?? null
    );
  }

  async openCash(
    context: TenantContext,
    branchId: string,
    openingAmount: number,
    warehouseId = 'deposito-1',
  ): Promise<CashSession> {
    const aberto = await this.getCurrentSession(context, branchId);
    if (aberto) throw new ConflictException('Você já tem um caixa aberto nesta filial');
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
      movements: [
        {
          id: randomUUID(),
          type: 'OPENING',
          amount: openingAmount,
          reason: 'Abertura do caixa',
          occurredAt: new Date().toISOString(),
          operatorId: context.userId,
        },
      ],
      warehouseId,
    });
  }

  async addMovement(
    context: TenantContext,
    sessionId: string,
    type: 'SUPPLY' | 'WITHDRAWAL',
    input: CashMovementInput,
  ): Promise<CashSession> {
    const session = await this.openSession(context, sessionId);
    const movement: CashMovement = {
      id: randomUUID(),
      type,
      amount: input.amount,
      reason: input.reason,
      occurredAt: new Date().toISOString(),
      operatorId: context.userId,
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

  async closeCash(context: TenantContext, sessionId: string, countedCash: number) {
    const session = await this.openSession(context, sessionId);
    return this.repository.save({
      ...session,
      closedAt: new Date().toISOString(),
      countedCash,
      difference: countedCash - session.expectedCash,
      movements: [
        ...session.movements,
        {
          id: randomUUID(),
          type: 'CLOSING',
          amount: countedCash,
          reason: 'Fechamento do caixa',
          occurredAt: new Date().toISOString(),
          operatorId: context.userId,
        },
      ],
    });
  }

  /** O caixa aberto do próprio operador — caixa de outro não se mexe. */
  async openSession(context: TenantContext, id: string): Promise<CashSession> {
    const session = await this.repository.find(context.tenantId, id);
    if (!session || session.operatorId !== context.userId)
      throw new NotFoundException('Caixa não encontrado');
    if (session.closedAt) throw new ConflictException('Caixa já fechado');
    return session;
  }
}
