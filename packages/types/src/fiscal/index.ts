export type FiscalDocumentKind = 'nfe' | 'nfce' | 'mdfe' | 'dfe';

export type FiscalEnvironment = 'homologacao' | 'producao';

export type FiscalDocumentStatus =
  'pending' | 'transmitted' | 'authorized' | 'rejected' | 'cancelled';

export interface FiscalDocumentRef {
  readonly kind: FiscalDocumentKind;
  readonly environment: FiscalEnvironment;
  readonly status: FiscalDocumentStatus;
  readonly accessKey: string | null;
}
