import { Inject, Injectable } from '@nestjs/common';
import type { Firestore } from '@synapse/firebase/admin';
import type { AuditLog } from '@synapse/types';
import { FIREBASE_FIRESTORE } from '../../iam/firebase.tokens';

export interface AuditFilters {
  userId?: string;
  entity?: string;
  from?: string;
  to?: string;
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
  async query(tenantId: string, filters: AuditFilters): Promise<AuditLog[]> {
    let query: FirebaseFirestore.Query = this.firestore.collection(`tenants/${tenantId}/auditLogs`);
    if (filters.userId) query = query.where('userId', '==', filters.userId);
    if (filters.entity) query = query.where('entity', '==', filters.entity);
    if (filters.from) query = query.where('occurredAt', '>=', filters.from);
    if (filters.to) query = query.where('occurredAt', '<=', filters.to);
    const result = await query.orderBy('occurredAt', 'desc').limit(250).get();
    return result.docs.map((doc) => doc.data() as AuditLog);
  }
}
