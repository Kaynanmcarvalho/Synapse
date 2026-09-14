import { Inject, Injectable } from '@nestjs/common';
import type { Firestore, QueryDocumentSnapshot } from '@synapse/firebase/admin';
import type { CashSession, PosSale } from '@synapse/types';
import { FIREBASE_FIRESTORE } from '../../iam/firebase.tokens';

/** Caixas em `tenants/{t}/caixas/{id}` e vendas do PDV em
 *  `tenants/{t}/vendasPdv/{id}`, com o número da venda em
 *  `contadores/vendasPdv`. Antes era memória: reiniciar a API fechava caixa
 *  aberto e apagava as vendas do dia. */
@Injectable()
export class CashSessionRepository {
  constructor(@Inject(FIREBASE_FIRESTORE) private readonly db: Firestore) {}

  private caixas(tenantId: string) {
    return this.db.collection(`tenants/${tenantId}/caixas`);
  }

  private vendas(tenantId: string) {
    return this.db.collection(`tenants/${tenantId}/vendasPdv`);
  }

  async find(tenantId: string, id: string): Promise<CashSession | undefined> {
    const snapshot = await this.caixas(tenantId).doc(id).get();
    return snapshot.exists ? (snapshot.data() as CashSession) : undefined;
  }

  async findOpenByOperator(
    tenantId: string,
    branchId: string,
    operatorId: string,
  ): Promise<CashSession | undefined> {
    const result = await this.caixas(tenantId)
      .where('operatorId', '==', operatorId)
      .where('branchId', '==', branchId)
      .where('closedAt', '==', null)
      .limit(1)
      .get();
    const [primeiro] = result.docs;
    return primeiro ? (primeiro.data() as CashSession) : undefined;
  }

  async save(session: CashSession): Promise<CashSession> {
    await this.caixas(session.tenantId).doc(session.id).set(session);
    return session;
  }

  /** Número sequencial da venda do PDV, em transação: dois caixas fechando venda
   *  ao mesmo tempo não imprimem o mesmo número. */
  async proximoNumero(tenantId: string): Promise<number> {
    const referencia = this.db.doc(`tenants/${tenantId}/contadores/vendasPdv`);
    return this.db.runTransaction(async (transacao) => {
      const lido = await transacao.get(referencia);
      const numero = ((lido.data()?.['ultimo'] as number | undefined) ?? 0) + 1;
      transacao.set(referencia, { ultimo: numero });
      return numero;
    });
  }

  async saveSale(tenantId: string, sale: PosSale): Promise<PosSale> {
    await this.vendas(tenantId)
      .doc(sale.id)
      .set(JSON.parse(JSON.stringify(sale)) as PosSale);
    return sale;
  }

  async findSale(tenantId: string, id: string): Promise<PosSale | undefined> {
    const snapshot = await this.vendas(tenantId).doc(id).get();
    return snapshot.exists ? (snapshot.data() as PosSale) : undefined;
  }

  /** Vendas de um caixa, da mais nova para a mais antiga (Histórico de Vendas). */
  async listSales(tenantId: string, cashSessionId: string, limite = 300): Promise<PosSale[]> {
    const result = await this.vendas(tenantId)
      .where('cashSessionId', '==', cashSessionId)
      .orderBy('completedAt', 'desc')
      .limit(limite)
      .get();
    return result.docs.map((doc: QueryDocumentSnapshot) => doc.data() as PosSale);
  }
}
