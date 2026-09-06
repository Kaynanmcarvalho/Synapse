import { Inject, Injectable } from '@nestjs/common';
import type { Firestore } from '@synapse/firebase/admin';
import { FIREBASE_FIRESTORE } from '../firebase.tokens';
import type { MembershipRecord } from '../iam.types';

@Injectable()
export class MembershipRepository {
  constructor(@Inject(FIREBASE_FIRESTORE) private readonly db: Firestore) {}

  async find(tenantId: string, userId: string): Promise<MembershipRecord | null> {
    const snapshot = await this.db.doc(`tenants/${tenantId}/users/${userId}`).get();
    if (!snapshot.exists) return null;
    return snapshot.data() as MembershipRecord;
  }

  /** actorId e quem fez a mudanca, nunca o alvo: gravar o alvo em updatedBy
   *  registraria a vitima como autora da propria alteracao. */
  async setMfaRequired(
    tenantId: string,
    userId: string,
    required: boolean,
    actorId: string,
  ): Promise<void> {
    await this.db.doc(`tenants/${tenantId}/users/${userId}`).update({
      mfaRequired: required,
      updatedAt: new Date(),
      updatedBy: actorId,
    });
  }

  async setStatus(
    tenantId: string,
    userId: string,
    status: 'active' | 'blocked',
    actorId: string,
  ): Promise<void> {
    await this.db.doc(`tenants/${tenantId}/users/${userId}`).update({
      status,
      updatedAt: new Date(),
      updatedBy: actorId,
    });
  }
}
