export type FiscalDocumentKind = 'NFE' | 'NFCE' | 'MDFE' | 'DFE';
export type FiscalEnvironment = 'MOCK' | 'SANDBOX' | 'HOMOLOGACAO' | 'PRODUCAO';
export type FiscalDocumentStatus =
  'DRAFT' | 'PROCESSING' | 'AUTHORIZED' | 'REJECTED' | 'DENIED' | 'CANCELLED' | 'CONTINGENCY';

export interface FiscalDocument {
  readonly id: string;
  readonly tenantId: string;
  readonly companyId: string;
  readonly kind: FiscalDocumentKind;
  readonly environment: FiscalEnvironment;
  readonly status: FiscalDocumentStatus;
  readonly series: number;
  readonly number: number;
  readonly accessKey: string | null;
  readonly protocol: string | null;
  readonly providerJobId: string | null;
  readonly xml: string | null;
  readonly sefazCode: string | null;
  readonly sefazMessage: string | null;
  readonly attempts: number;
  readonly idempotencyKey: string;
  readonly issuedAt: string | null;
}

export interface FiscalCompanyConfig {
  readonly companyId: string;
  readonly environment: FiscalEnvironment;
  readonly provider: 'MOCK' | 'GYN_FISCAL';
  readonly crt: 1 | 2 | 3 | 4;
  readonly stateRegistration: string;
  readonly cscId: string | null;
  readonly cscSecretRef: string | null;
  readonly nfeSeries: number;
  readonly nfceSeries: number;
  readonly nfceContingencyEnabled?: boolean;
  readonly nfceCancellationWindowMinutes?: number;
  readonly state: string;
  readonly taxRegime: string;
  readonly certificateSecretRef: string | null;
  readonly certificatePasswordSecretRef: string | null;
  readonly providerApiKeySecretRef: string | null;
  readonly providerTenantIdSecretRef: string | null;
}

export interface FiscalIssueCommand {
  readonly companyId: string;
  readonly referenceId: string;
  readonly number: number;
  readonly series: number;
  readonly payload: Record<string, unknown>;
  readonly idempotencyKey: string;
}
export interface FiscalEventCommand {
  readonly companyId: string;
  readonly accessKey: string;
  readonly protocol: string;
  readonly justification: string;
  readonly idempotencyKey: string;
}
export interface FiscalProviderResult {
  readonly status: FiscalDocumentStatus;
  readonly providerId: string;
  readonly jobId: string | null;
  readonly accessKey: string | null;
  readonly protocol: string | null;
  readonly xml: string | null;
  readonly code: string | null;
  readonly message: string | null;
}
export interface FiscalConsultResult extends FiscalProviderResult {
  readonly raw: Readonly<Record<string, unknown>>;
}

export interface FiscalProvider {
  issueNFe(command: FiscalIssueCommand): Promise<FiscalProviderResult>;
  issueNFCe(command: FiscalIssueCommand): Promise<FiscalProviderResult>;
  cancelDocument(command: FiscalEventCommand): Promise<FiscalProviderResult>;
  correctNFe(command: FiscalEventCommand): Promise<FiscalProviderResult>;
  consultDocument(accessKey: string): Promise<FiscalConsultResult>;
  downloadXml(providerId: string): Promise<string>;
  getDanfe(xml: string): Promise<Uint8Array>;
  queryDFe(query: Readonly<Record<string, unknown>>): Promise<readonly FiscalConsultResult[]>;
  issueMDFe(command: FiscalIssueCommand): Promise<FiscalProviderResult>;
}
