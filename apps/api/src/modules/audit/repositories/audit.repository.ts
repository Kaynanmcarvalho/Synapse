import { Inject, Injectable } from '@nestjs/common';
import type { Firestore } from '@synapse/firebase/admin';
import type { AuditLog } from '@synapse/types';
import type { Page } from '@synapse/types';
import { BadRequestException } from '@nestjs/common';
import { FIREBASE_FIRESTORE } from '../../iam/firebase.tokens';

export interface AuditFilters {
  userId?: string;
  entity?: string;
  from?: string;
  to?: string;
  cursor?: string;
  limit: number;
}
@Injectable()
export class AuditRepository {
  constructor(@Inject(FIREBASE_FIRESTORE) private readonly firestore: Firestore) {}
  async append(log: AuditLog): Promise<void> {
    await this.firestore.doc(`tenants/${log.tenantId}/auditLogs/${log.id}`).create(log);
  }
  async snapshot(tenantId: string, collection: string, id: string | undefined) {
    if (!id) return null;
    const snap = await this.firestore.doc(`tenants/${tenantId}/${collection}/${id}`).get();
    return snap.exists ? (snap.data() ?? null) : null;
  }
  async query(tenantId: string, filters: AuditFilters): Promise<Page<AuditLog>> {
    const collection = this.firestore.collection(`tenants/${tenantId}/auditLogs`);
    let query: FirebaseFirestore.Query = collection;
    if (filters.userId) query = query.where('userId', '==', filters.userId);
    if (filters.entity) query = query.where('entity', '==', filters.entity);
    if (filters.from) query = query.where('occurredAt', '>=', filters.from);
    if (filters.to) query = query.where('occurredAt', '<=', filters.to);
    query = query.orderBy('occurredAt', 'desc');
    if (filters.cursor) {
      const cursor = await collection.doc(filters.cursor).get();
      if (!cursor.exists) throw new BadRequestException('Cursor de auditoria inválido');
      query = query.startAfter(cursor);
    }
    const result = await query.limit(filters.limit + 1).get();
    const hasMore = result.docs.length > filters.limit;
    const docs = result.docs.slice(0, filters.limit);
    return {
      items: docs.map((doc) => doc.data() as AuditLog),
      hasMore,
      nextCursor: hasMore ? (docs.at(-1)?.id ?? null) : null,
    };
  }
}
