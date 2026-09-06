import { Inject, Injectable } from '@nestjs/common';
import type { Firestore } from '@synapse/firebase/admin';
import type { IntegrationServiceId, IntegrationTestResult } from '@synapse/types';
import { FIREBASE_FIRESTORE } from '../../iam/firebase.tokens';

export interface PlatformStatusDoc {
  readonly integrationTests: Partial<
    Record<IntegrationServiceId, { lastTest: IntegrationTestResult | null }>
  >;
  readonly integrationHomologationTests: Partial<
    Record<IntegrationServiceId, { lastHomologationTest: IntegrationTestResult | null }>
  >;
  readonly homologationPassed: boolean;
  readonly productionActivatedAt: string | null;
  readonly productionActivatedBy: string | null;
}

const EMPTY_STATUS: PlatformStatusDoc = {
  integrationTests: {},
  integrationHomologationTests: {},
  homologationPassed: false,
  productionActivatedAt: null,
  productionActivatedBy: null,
};

/** Um documento por tenant guarda tudo que a Central de Integrações e o
 *  assistente de ativação (§64/§65) precisam lembrar entre requisições:
 *  resultado do último teste de cada serviço, se algum teste de homologação
 *  já passou, e o registro de quem ativou produção e quando. */
@Injectable()
export class PlatformRepository {
  constructor(@Inject(FIREBASE_FIRESTORE) private readonly firestore: Firestore) {}

  private doc(tenantId: string) {
    return this.firestore.doc(`tenants/${tenantId}/platform/status`);
  }

  async getStatus(tenantId: string): Promise<PlatformStatusDoc> {
    const snapshot = await this.doc(tenantId).get();
    return snapshot.exists
      ? { ...EMPTY_STATUS, ...(snapshot.data() as PlatformStatusDoc) }
      : EMPTY_STATUS;
  }

  async recordTest(
    tenantId: string,
    service: IntegrationServiceId,
    result: IntegrationTestResult,
  ): Promise<void> {
    const current = await this.getStatus(tenantId);
    await this.doc(tenantId).set(
      {
        ...current,
        integrationTests: { ...current.integrationTests, [service]: { lastTest: result } },
      },
      { merge: true },
    );
  }

  async recordHomologationTest(
    tenantId: string,
    service: IntegrationServiceId,
    result: IntegrationTestResult,
  ): Promise<void> {
    const current = await this.getStatus(tenantId);
    await this.doc(tenantId).set(
      {
        ...current,
        integrationHomologationTests: {
          ...current.integrationHomologationTests,
          [service]: { lastHomologationTest: result },
        },
        homologationPassed: current.homologationPassed || result.success,
      },
      { merge: true },
    );
  }

  async activateProduction(tenantId: string, activatedBy: string, now: string): Promise<void> {
    await this.doc(tenantId).set(
      { productionActivatedAt: now, productionActivatedBy: activatedBy },
      { merge: true },
    );
  }
}
