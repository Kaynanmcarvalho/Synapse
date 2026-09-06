import { Injectable } from '@nestjs/common';
import type {
  AnonymizationResult,
  ConsentPurpose,
  ConsentRecord,
  DataSubjectExport,
} from '@synapse/types';
import { randomUUID } from 'node:crypto';
import { PartnerService } from '../../catalog/services/partner.service';
import type { TenantContext } from '../../iam/iam.types';
import { ConsentRepository } from '../repositories/consent.repository';

/** §49 (LGPD). O unico titular de dados que o sistema conhece hoje e o
 *  cliente cadastrado em catalog/partners — usuarios internos (funcionarios)
 *  entram quando o modulo de RH/onboarding tiver um cadastro proprio. Cada
 *  dominio novo que guardar dado pessoal (fornecedor, vendedor externo) deve
 *  estender `exportCustomer`/`anonymizeCustomer` com sua propria secao. */
@Injectable()
export class DataSubjectService {
  constructor(
    private readonly consents: ConsentRepository,
    private readonly partners: PartnerService,
  ) {}

  recordConsent(
    tenant: TenantContext,
    subjectId: string,
    purpose: ConsentPurpose,
    granted: boolean,
    ip: string | null,
  ): ConsentRecord {
    return this.consents.append({
      id: randomUUID(),
      tenantId: tenant.tenantId as ConsentRecord['tenantId'],
      subjectType: 'CUSTOMER',
      subjectId,
      purpose,
      granted,
      recordedAt: new Date().toISOString(),
      recordedBy: tenant.userId,
      ip,
    });
  }

  consentStatus(tenant: TenantContext, subjectId: string): ConsentRecord[] {
    return this.consents.current(tenant.tenantId, subjectId);
  }

  /** Exportacao completa do titular (c39-6): cadastro, historico de
   *  atendimento e todo consentimento ja registrado. */
  exportSubjectData(tenant: TenantContext, subjectId: string): DataSubjectExport {
    const customer = this.partners.getCustomer(tenant.tenantId, subjectId);
    return {
      subjectType: 'CUSTOMER',
      subjectId,
      exportedAt: new Date().toISOString(),
      sections: {
        cadastro: customer,
        historicoDeAtendimento: this.partners.history(subjectId),
        consentimentos: this.consents.history(tenant.tenantId, subjectId),
      },
    };
  }

  /** Anonimizacao/exclusao (c39-7). Recusa quando ha credito em aberto — a
   *  guarda fiscal e financeira tem base legal e prevalece sobre o pedido
   *  ate a pendencia ser resolvida (§49: "quando legalmente possivel"). */
  anonymize(tenant: TenantContext, subjectId: string): AnonymizationResult {
    const anonymized = this.partners.anonymizeCustomer(tenant.tenantId, subjectId);
    if (!anonymized) {
      return { subjectId, anonymized: false, refusalReason: 'OPEN_FINANCIAL_OBLIGATION' };
    }
    return { subjectId, anonymized: true, refusalReason: null };
  }
}
