import type { TenantId } from '../common';

/** §49: LGPD. Sujeito de dados hoje e sempre um cliente (CUSTOMER) ou um
 *  usuario do sistema (USER) — os dois lugares onde guardamos CPF/CNPJ,
 *  nome, telefone e e-mail de uma pessoa fisica ou responsavel legal. */
export type DataSubjectType = 'CUSTOMER' | 'USER';

export type ConsentPurpose = 'MARKETING' | 'DATA_SHARING' | 'ESSENTIAL';

export interface ConsentRecord {
  readonly id: string;
  readonly tenantId: TenantId;
  readonly subjectType: DataSubjectType;
  readonly subjectId: string;
  readonly purpose: ConsentPurpose;
  readonly granted: boolean;
  readonly recordedAt: string;
  readonly recordedBy: string;
  readonly ip: string | null;
}

export interface DataSubjectExport {
  readonly subjectType: DataSubjectType;
  readonly subjectId: string;
  readonly exportedAt: string;
  readonly sections: Readonly<Record<string, unknown>>;
}

export type AnonymizationRefusalReason = 'OPEN_FINANCIAL_OBLIGATION' | 'LEGAL_RETENTION_REQUIRED';

export interface AnonymizationResult {
  readonly subjectId: string;
  readonly anonymized: boolean;
  readonly refusalReason: AnonymizationRefusalReason | null;
}
