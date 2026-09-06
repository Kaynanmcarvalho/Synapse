import { Inject, Injectable } from '@nestjs/common';
import type { Firestore, QueryDocumentSnapshot } from '@synapse/firebase/admin';
import { randomUUID } from 'node:crypto';
import { FIREBASE_FIRESTORE } from '../firebase.tokens';

export interface DeviceSession {
  readonly id: string;
  readonly deviceId: string;
  readonly name: string;
  readonly platform: string;
  readonly createdAt: Date;
  readonly lastSeenAt: Date;
  readonly revokedAt: Date | null;
}

@Injectable()
export class SessionRepository {
  constructor(@Inject(FIREBASE_FIRESTORE) private readonly db: Firestore) {}

  private collection(tenantId: string, userId: string) {
    return this.db.collection(`tenants/${tenantId}/users/${userId}/sessions`);
  }

  async create(
    tenantId: string,
    userId: string,
    input: Pick<DeviceSession, 'deviceId' | 'name' | 'platform'>,
  ): Promise<DeviceSession> {
    const id = randomUUID();
    const now = new Date();
    const session: DeviceSession = {
      id,
      ...input,
      createdAt: now,
      lastSeenAt: now,
      revokedAt: null,
    };
    await this.collection(tenantId, userId).doc(id).set(session);
    return session;
  }

  async list(tenantId: string, userId: string): Promise<DeviceSession[]> {
    const result = await this.collection(tenantId, userId).orderBy('createdAt', 'desc').get();
    return result.docs.map((document: QueryDocumentSnapshot) => document.data() as DeviceSession);
  }

  async isActive(tenantId: string, userId: string, sessionId: string): Promise<boolean> {
    const snapshot = await this.collection(tenantId, userId).doc(sessionId).get();
    return snapshot.exists && snapshot.data()?.['revokedAt'] == null;
  }

  async revoke(tenantId: string, userId: string, sessionId: string): Promise<void> {
    await this.collection(tenantId, userId).doc(sessionId).update({ revokedAt: new Date() });
  }

  async revokeAll(tenantId: string, userId: string): Promise<void> {
    const active = await this.collection(tenantId, userId).where('revokedAt', '==', null).get();
    const batch = this.db.batch();
    const revokedAt = new Date();
    active.docs.forEach((document: QueryDocumentSnapshot) =>
      batch.update(document.ref, { revokedAt }),
    );
    await batch.commit();
  }
}
