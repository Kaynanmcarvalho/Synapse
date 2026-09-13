import { Inject, Injectable } from '@nestjs/common';
import type { Firestore } from '@synapse/firebase/admin';
import type { FiscalCompanyConfig, FiscalDocument } from '@synapse/types';
import { TenantSearchIndex } from '../../../common/search/tenant-search-index';
import { FIREBASE_FIRESTORE } from '../../iam/firebase.tokens';

export interface NfceContingencyItem {
  readonly documentId: string;
  readonly companyId: string;
  readonly payload: Readonly<Record<string, unknown>>;
  readonly idempotencyKey: string;
  readonly queuedAt: string;
}

@Injectable()
export class FiscalRepository {
  constructor(@Inject(FIREBASE_FIRESTORE) private readonly firestore: Firestore) {}
  readonly searchIndex = new TenantSearchIndex<FiscalDocument>();
  private readonly documents = new Map<string, FiscalDocument>();
  private readonly sequences = new Map<string, number>();
  private readonly idempotency = new Map<string, string>();
  private readonly nfceContingency = new Map<string, NfceContingencyItem>();
  saveDocument(document: FiscalDocument): FiscalDocument {
    this.searchIndex.put(
      document,
      `${document.accessKey ?? ''} ${document.number} ${document.series} ${document.kind}`,
    );
    this.documents.set(document.id, document);
    this.idempotency.set(document.idempotencyKey, document.id);
    return document;
  }
  findDocument(id: string): FiscalDocument | undefined {
    return this.documents.get(id);
  }
  findByIdempotency(key: string): FiscalDocument | undefined {
    const id = this.idempotency.get(key);
    return id ? this.documents.get(id) : undefined;
  }
  listByTenant(tenantId: string): FiscalDocument[] {
    return [...this.documents.values()].filter((document) => document.tenantId === tenantId);
  }
  async saveConfig(config: FiscalCompanyConfig): Promise<FiscalCompanyConfig> {
    await this.firestore.doc(`tenants/${config.companyId}/fiscal/config`).set(config);
    return config;
  }
  async findConfig(companyId: string): Promise<FiscalCompanyConfig | undefined> {
    const snapshot = await this.firestore.doc(`tenants/${companyId}/fiscal/config`).get();
    return snapshot.exists ? (snapshot.data() as FiscalCompanyConfig) : undefined;
  }
  enqueueNfce(item: NfceContingencyItem): NfceContingencyItem {
    this.nfceContingency.set(item.documentId, item);
    return item;
  }
  findQueuedNfce(documentId: string): NfceContingencyItem | undefined {
    return this.nfceContingency.get(documentId);
  }
  listQueuedNfce(): readonly NfceContingencyItem[] {
    return [...this.nfceContingency.values()];
  }
  dequeueNfce(documentId: string): void {
    this.nfceContingency.delete(documentId);
  }
  /** Atômica no processo; o adaptador PostgreSQL usa SELECT FOR UPDATE. */
  nextNumber(companyId: string, kind: 'NFE' | 'NFCE', series: number, initialNumber = 1): number {
    const key = `${companyId}:${kind}:${series}`;
    const number = this.sequences.has(key)
      ? (this.sequences.get(key) as number) + 1
      : initialNumber;
    this.sequences.set(key, number);
    return number;
  }
}
