import { BadRequestException, Inject, Injectable } from '@nestjs/common';
import type { Firestore, QueryDocumentSnapshot } from '@synapse/firebase/admin';
import type { Lot, LotReservation, Page } from '@synapse/types';
import { FIREBASE_FIRESTORE } from '../../iam/firebase.tokens';

@Injectable()
export class LotRepository {
  constructor(@Inject(FIREBASE_FIRESTORE) private readonly firestore: Firestore) {}

  private collection(tenantId: string) {
    return this.firestore.collection(`tenants/${tenantId}/lots`);
  }

  async create(tenantId: string, lot: Lot): Promise<Lot> {
    await this.collection(tenantId).doc(lot.id).create(lot);
    return lot;
  }

  async findById(tenantId: string, lotId: string): Promise<Lot | null> {
    const snapshot = await this.collection(tenantId).doc(lotId).get();
    return snapshot.exists ? (snapshot.data() as Lot) : null;
  }

  /** Todos os lotes com saldo (fisico - reservado > 0) do produto naquele
   *  deposito, do mais proximo do vencimento para o mais distante — a ordem
   *  que o FEFO consome. */
  async listAvailable(
    tenantId: string,
    branchId: string,
    warehouseId: string,
    productId: string,
  ): Promise<Lot[]> {
    const snapshot = await this.collection(tenantId)
      .where('branchId', '==', branchId)
      .where('warehouseId', '==', warehouseId)
      .where('productId', '==', productId)
      .orderBy('expiresAt', 'asc')
      .get();
    return snapshot.docs
      .map((document: QueryDocumentSnapshot) => document.data() as Lot)
      .filter((lot) => lot.physical - lot.reserved > 0);
  }

  async listExpiring(
    tenantId: string,
    expiresBefore: string,
    limit: number,
    cursor?: string,
  ): Promise<Page<Lot>> {
    const collection = this.collection(tenantId);
    let query = collection.where('expiresAt', '<=', expiresBefore).orderBy('expiresAt', 'asc');
    if (cursor) {
      const snapshot = await collection.doc(cursor).get();
      if (!snapshot.exists) throw new BadRequestException('Cursor de lote inválido');
      query = query.startAfter(snapshot);
    }
    const snapshot = await query.limit(limit + 1).get();
    const hasMore = snapshot.docs.length > limit;
    const docs = snapshot.docs.slice(0, limit);
    return {
      items: docs.map((document: QueryDocumentSnapshot) => document.data() as Lot),
      hasMore,
      nextCursor: hasMore ? (docs.at(-1)?.id ?? null) : null,
    };
  }

  /** Reserva ou baixa (delta negativo) uma quantidade de um lote especifico,
   *  numa transacao — o mesmo padrao de `InventoryRepository.transact`. */
  async applyDelta(
    tenantId: string,
    lotId: string,
    physicalDelta: number,
    reservedDelta: number,
  ): Promise<Lot> {
    return this.firestore.runTransaction(async (transaction) => {
      const reference = this.collection(tenantId).doc(lotId);
      const snapshot = await transaction.get(reference);
      if (!snapshot.exists) throw new Error(`Lote ${lotId} não encontrado`);
      const lot = snapshot.data() as Lot;
      const updated: Lot = {
        ...lot,
        physical: lot.physical + physicalDelta,
        reserved: lot.reserved + reservedDelta,
      };
      transaction.set(reference, updated);
      return updated;
    });
  }

  /** FEFO: reserva a quantidade pedida a partir dos lotes com validade mais
   *  proxima, andando para o proximo so quando o atual nao basta. A leitura
   *  dos candidatos e uma query normal; a aplicacao e uma unica transacao que
   *  releitura cada lote envolvido antes de escrever — assim dois pedidos
   *  concorrentes nunca reservam a mesma unidade duas vezes. */
  async reserveFefo(
    tenantId: string,
    branchId: string,
    warehouseId: string,
    productId: string,
    quantity: number,
  ): Promise<LotReservation[]> {
    const candidates = await this.listAvailable(tenantId, branchId, warehouseId, productId);
    if (candidates.length === 0) {
      throw new BadRequestException('Nenhum lote com saldo disponível para este produto');
    }

    return this.firestore.runTransaction(async (transaction) => {
      // Firestore exige todas as leituras da transacao antes de qualquer
      // escrita — por isso le todos os lotes candidatos primeiro, monta o
      // plano de reserva em memoria, e so depois escreve.
      const references = candidates.map((candidate) => this.collection(tenantId).doc(candidate.id));
      const snapshots = await Promise.all(
        references.map((reference) => transaction.get(reference)),
      );

      let remaining = quantity;
      const reservations: LotReservation[] = [];
      const writes: Array<{ reference: (typeof references)[number]; lot: Lot }> = [];

      for (const snapshot of snapshots) {
        if (remaining <= 0) break;
        if (!snapshot.exists) continue;
        const lot = snapshot.data() as Lot;
        const available = lot.physical - lot.reserved;
        if (available <= 0) continue;

        const taken = Math.min(available, remaining);
        writes.push({ reference: snapshot.ref, lot: { ...lot, reserved: lot.reserved + taken } });
        reservations.push({ lotId: lot.id, expiresAt: lot.expiresAt, quantity: taken });
        remaining -= taken;
      }

      if (remaining > 0) {
        throw new BadRequestException(
          `Saldo insuficiente: faltaram ${remaining} unidades para completar a reserva`,
        );
      }

      for (const write of writes) transaction.set(write.reference, write.lot);
      return reservations;
    });
  }
}
