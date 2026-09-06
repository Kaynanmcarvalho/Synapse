import { Injectable } from '@nestjs/common';
import type { CashSession, PosSale } from '@synapse/types';

@Injectable()
export class CashSessionRepository {
  private readonly sessions = new Map<string, CashSession>();
  private readonly sales = new Map<string, PosSale>();
  find(id: string): CashSession | undefined {
    return this.sessions.get(id);
  }
  findOpenByOperator(
    tenantId: string,
    branchId: string,
    operatorId: string,
  ): CashSession | undefined {
    return [...this.sessions.values()].find(
      (session) =>
        session.tenantId === tenantId &&
        session.branchId === branchId &&
        session.operatorId === operatorId &&
        session.closedAt === null,
    );
  }
  save(session: CashSession): CashSession {
    this.sessions.set(session.id, session);
    return session;
  }
  saveSale(sale: PosSale): PosSale {
    this.sales.set(sale.id, sale);
    return sale;
  }
  findSale(id: string): PosSale | undefined {
    return this.sales.get(id);
  }
}
