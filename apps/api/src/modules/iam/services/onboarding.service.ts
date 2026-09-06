import { ConflictException, Inject, Injectable } from '@nestjs/common';
import type { Auth, Firestore, Transaction } from '@synapse/firebase/admin';
import { randomUUID } from 'node:crypto';
import type { CompanyOnboardingInput } from '../dto/iam.schemas';
import { FIREBASE_AUTH, FIREBASE_FIRESTORE } from '../firebase.tokens';

@Injectable()
export class OnboardingService {
  constructor(
    @Inject(FIREBASE_AUTH) private readonly auth: Auth,
    @Inject(FIREBASE_FIRESTORE) private readonly db: Firestore,
  ) {}

  async createCompany(userId: string, input: CompanyOnboardingInput) {
    const user = await this.auth.getUser(userId);
    if (typeof user.customClaims?.['tenantId'] === 'string') {
      throw new ConflictException('Usuário já possui tenant ativo');
    }

    const tenantId = randomUUID();
    const companyId = randomUUID();
    const now = new Date();
    await this.db.runTransaction(async (transaction: Transaction) => {
      transaction.create(this.db.doc(`tenants/${tenantId}`), {
        id: tenantId,
        name: input.tradeName,
        status: 'active',
        timezone: input.timezone,
        createdAt: now,
        createdBy: userId,
        updatedAt: now,
        updatedBy: userId,
        version: 1,
      });
      transaction.create(this.db.doc(`tenants/${tenantId}/company/${companyId}`), {
        id: companyId,
        tenantId,
        legalName: input.legalName,
        tradeName: input.tradeName,
        cnpj: input.cnpj,
        createdAt: now,
        createdBy: userId,
        updatedAt: now,
        updatedBy: userId,
        version: 1,
      });
      transaction.create(this.db.doc(`tenants/${tenantId}/users/${userId}`), {
        authUid: userId,
        status: 'active',
        roleIds: ['ADMIN_EMPRESA'],
        branchIds: [],
        warehouseIds: [],
        mfaRequired: false,
        createdAt: now,
        createdBy: userId,
        updatedAt: now,
        updatedBy: userId,
        version: 1,
      });
    });
    await this.auth.setCustomUserClaims(userId, {
      ...user.customClaims,
      tenantId,
    });
    return { tenantId, companyId, refreshTokenRequired: true };
  }
}
