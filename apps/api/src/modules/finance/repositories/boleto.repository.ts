import { BadRequestException, Inject, Injectable, NotFoundException } from '@nestjs/common';
import type { Firestore } from '@synapse/firebase/admin';
import type { BankAccountConfig, Titulo } from '@synapse/types';
import { createHash } from 'node:crypto';
import { FIREBASE_FIRESTORE } from '../../iam/firebase.tokens';
import { registrarLiquidacao } from '../entities/titulo';
import { assertPayable, type Charge } from '../entities/boleto';
import { searchTokens } from '../../../common/search/search-tokens';

@Injectable()
export class BoletoRepository {
  constructor(@Inject(FIREBASE_FIRESTORE) private readonly db: Firestore) {}
  ref(tenantId: string, id: string) {
    return this.db.doc(`tenants/${tenantId}/boletos/${id}`);
  }
  async get(tenantId: string, id: string): Promise<Charge> {
    const doc = await this.ref(tenantId, id).get();
    if (!doc.exists) throw new NotFoundException('Boleto não encontrado');
    return doc.data() as Charge;
  }
  async account(tenantId: string, id: string): Promise<BankAccountConfig> {
    const doc = await this.db.doc(`tenants/${tenantId}/bankAccounts/${id}`).get();
    if (!doc.exists) throw new NotFoundException('Conta bancária não encontrada');
    return doc.data() as BankAccountConfig;
  }
  async accounts(tenantId: string): Promise<BankAccountConfig[]> {
    const result = await this.db.collection(`tenants/${tenantId}/bankAccounts`).get();
    return result.docs.map((d) => d.data() as BankAccountConfig);
  }
  async saveAccount(tenantId: string, account: BankAccountConfig, userId: string) {
    await this.db
      .doc(`tenants/${tenantId}/bankAccounts/${account.id}`)
      .set({ ...account, updatedAt: new Date().toISOString(), updatedBy: userId });
    return account;
  }
  async create(charge: Charge, titulo: Titulo) {
    return this.db.runTransaction(async (tx) => {
      const ref = this.ref(charge.tenantId, charge.id);
      const existing = await tx.get(ref);
      if (existing.exists) {
        const saved = existing.data() as Charge;
        if (JSON.stringify(saved.input) !== JSON.stringify(charge.input))
          throw new BadRequestException('Chave de idempotência reutilizada com dados diferentes');
        return saved;
      }
      tx.create(ref, charge);
      tx.create(this.db.doc(`tenants/${charge.tenantId}/titulos/${titulo.id}`), {
        ...titulo,
        searchTokens: searchTokens(`${titulo.id} ${titulo.descricao} ${titulo.customerId}`),
      });
      tx.create(this.db.doc(`bankReferences/${charge.id}`), {
        tenantId: charge.tenantId,
        accountId: charge.accountId,
      });
      return charge;
    });
  }
  async transition(
    tenantId: string,
    id: string,
    expected: Charge['status'][],
    patch: Partial<Charge>,
  ) {
    return this.db.runTransaction(async (tx) => {
      const ref = this.ref(tenantId, id);
      const doc = await tx.get(ref);
      if (!doc.exists) throw new NotFoundException('Boleto não encontrado');
      const charge = doc.data() as Charge;
      if (!expected.includes(charge.status))
        throw new BadRequestException('Estado do boleto mudou; consulte novamente');
      tx.update(ref, patch);
      return { ...charge, ...patch };
    });
  }
  async settle(
    tenantId: string,
    id: string,
    eventId: string,
    amount: number,
    userId: string,
    note: string,
  ) {
    return this.db.runTransaction(async (tx) => {
      const ref = this.ref(tenantId, id);
      const eventRef = ref
        .collection('events')
        .doc(createHash('sha256').update(eventId).digest('hex'));
      const [doc, event] = await Promise.all([tx.get(ref), tx.get(eventRef)]);
      if (!doc.exists) throw new NotFoundException('Boleto não encontrado');
      const charge = doc.data() as Charge;
      if (event.exists || charge.status === 'PAID') return charge;
      assertPayable(charge, amount);
      const titleRef = this.db.doc(`tenants/${tenantId}/titulos/${charge.tituloId}`);
      const titleDoc = await tx.get(titleRef);
      if (!titleDoc.exists) throw new NotFoundException('Título vinculado não encontrado');
      const now = new Date().toISOString();
      const titulo = registrarLiquidacao(
        titleDoc.data() as Titulo,
        {
          id: eventId,
          data: now.slice(0, 10),
          valorCentavos: amount,
          forma: 'BOLETO',
          observacao: note,
          referenciaBancaria: charge.bank?.nossoNumero ?? null,
          registradoPor: userId as Titulo['criadoPor'],
          registradoEm: now,
        },
        now,
      );
      tx.set(titleRef, titulo, { merge: true });
      tx.update(ref, { status: 'PAID' });
      tx.create(eventRef, { eventId, amount, userId, note, occurredAt: now });
      return { ...charge, status: 'PAID' as const };
    });
  }
  async cancel(tenantId: string, id: string) {
    return this.db.runTransaction(async (tx) => {
      const ref = this.ref(tenantId, id);
      const doc = await tx.get(ref);
      if (!doc.exists) throw new NotFoundException('Boleto não encontrado');
      const charge = doc.data() as Charge;
      if (charge.status === 'PAID')
        throw new BadRequestException('Boleto pago não pode ser cancelado');
      tx.update(ref, { status: 'CANCELLED' });
      tx.update(this.db.doc(`tenants/${tenantId}/titulos/${charge.tituloId}`), {
        status: 'CANCELADO',
      });
      return { ...charge, status: 'CANCELLED' as const };
    });
  }
  async list(tenantId: string, branchId: string) {
    const result = await this.db
      .collection(`tenants/${tenantId}/boletos`)
      .where('branchId', '==', branchId)
      .orderBy('createdAt', 'desc')
      .limit(100)
      .get();
    return result.docs.map((d) => d.data() as Charge);
  }
  async markOverdue(today: string) {
    const tenants = await this.db.collection('tenants').get();
    for (const tenant of tenants.docs) {
      for (;;) {
        const result = await this.db
          .collection(`tenants/${tenant.id}/boletos`)
          .where('status', '==', 'REGISTERED')
          .where('dueDate', '<', today)
          .limit(300)
          .get();
        if (result.empty) break;
        await Promise.all(
          result.docs.map((doc) =>
            this.transition(tenant.id, doc.id, ['REGISTERED'], { status: 'OVERDUE' }).catch(
              (error: unknown) => {
                if (!(error instanceof BadRequestException)) throw error;
              },
            ),
          ),
        );
      }
    }
  }
}
