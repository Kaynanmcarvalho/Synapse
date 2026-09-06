import { Injectable } from '@nestjs/common';
import type { FiscalCompanyConfig, FiscalDocument } from '@synapse/types';

@Injectable()
export class FiscalRepository {
  private readonly documents = new Map<string, FiscalDocument>();
  private readonly configs = new Map<string, FiscalCompanyConfig>();
  private readonly sequences = new Map<string, number>();
  private readonly idempotency = new Map<string, string>();
  saveDocument(document: FiscalDocument): FiscalDocument {
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
  saveConfig(config: FiscalCompanyConfig): FiscalCompanyConfig {
    this.configs.set(config.companyId, config);
    return config;
  }
  findConfig(companyId: string): FiscalCompanyConfig | undefined {
    return this.configs.get(companyId);
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
