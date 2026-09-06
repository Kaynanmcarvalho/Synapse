import { Injectable } from '@nestjs/common';
import type { CashSession, PosSale } from '@synapse/types';

@Injectable()
export class CashSessionRepository {
  private readonly sessions = new Map<string, CashSession>();
  private readonly sales = new Map<string, PosSale>();
  find(id: string): CashSession | undefined {
    return this.sessions.get(id);
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
