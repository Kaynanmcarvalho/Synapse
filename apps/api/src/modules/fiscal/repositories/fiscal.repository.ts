import { Inject, Injectable } from '@nestjs/common';
import type { Firestore, QueryDocumentSnapshot } from '@synapse/firebase/admin';
import type { FiscalCompanyConfig, FiscalDocument } from '@synapse/types';
import { createHash } from 'node:crypto';
import { searchTerms, searchTokens } from '../../../common/search/search-tokens';
import { FIREBASE_FIRESTORE } from '../../iam/firebase.tokens';

export interface NfceContingencyItem {
  readonly documentId: string;
  readonly tenantId: string;
  readonly companyId: string;
  readonly payload: Readonly<Record<string, unknown>>;
  readonly idempotencyKey: string;
  readonly queuedAt: string;
}

/** De onde sai o numero da nota nova. NF-e e NFC-e numeram por empresa, modelo
 *  e serie; o MDF-e ainda chega com o numero pronto. */
export type FiscalNumbering =
  | {
      readonly companyId: string;
      readonly kind: 'NFE' | 'NFCE';
      readonly series: number;
      /** Proximo numero informado no Assistente de Configuracao. */
      readonly initialNumber?: number | undefined;
    }
  | { readonly fixedNumber: number };

export interface ReservedDocument {
  readonly document: FiscalDocument;
  /** A chave de idempotencia ja tinha nota: nada foi gravado nem numerado. */
  readonly replayed: boolean;
}

type StoredDocument = FiscalDocument & { readonly searchTokens?: readonly string[] };

/** O Firestore recusa `undefined`, e payload de venda e resposta de provedor trazem. */
const withoutUndefined = <T>(value: T): T => JSON.parse(JSON.stringify(value)) as T;

/** Notas, numeracao, idempotencia e fila de contingencia no Firestore, sob o
 *  tenant. Nada fica em memoria: reiniciar a API nao repete numero nem perde nota. */
@Injectable()
export class FiscalRepository {
  constructor(@Inject(FIREBASE_FIRESTORE) private readonly firestore: Firestore) {}

  /** Idempotencia, numero e rascunho na mesma transacao. Dois caixas fechando
   *  venda ao mesmo tempo nunca levam o mesmo numero, e a mesma chave repetida
   *  devolve a nota que ja existe sem gastar numero. */
  async reserveDocument(
    draft: Omit<FiscalDocument, 'number'>,
    numbering: FiscalNumbering,
  ): Promise<ReservedDocument> {
    const claim = this.idempotencyRef(draft.tenantId, draft.idempotencyKey);
    const target = this.documentRef(draft.tenantId, draft.id);
    return this.firestore.runTransaction(async (transaction) => {
      const claimed = await transaction.get(claim);
      if (claimed.exists) {
        const documentId = String(claimed.data()?.['documentId']);
        const stored = await transaction.get(this.documentRef(draft.tenantId, documentId));
        if (!stored.exists)
          throw new Error(`Nota fiscal da chave de idempotência não encontrada: ${documentId}`);
        return { document: this.fromStored(stored.data()), replayed: true };
      }
      let number: number;
      if ('fixedNumber' in numbering) {
        number = numbering.fixedNumber;
      } else {
        const sequence = this.sequenceRef(numbering.companyId, numbering.kind, numbering.series);
        const current = await transaction.get(sequence);
        number = this.nextNumber(current.data()?.['lastNumber'], numbering.initialNumber);
        transaction.set(sequence, {
          companyId: numbering.companyId,
          kind: numbering.kind,
          series: numbering.series,
          lastNumber: number,
          updatedAt: new Date().toISOString(),
        });
      }
      const document: FiscalDocument = { ...draft, number };
      transaction.create(claim, {
        documentId: document.id,
        idempotencyKey: document.idempotencyKey,
        createdAt: new Date().toISOString(),
      });
      transaction.create(target, this.toStored(document));
      return { document, replayed: false };
    });
  }

  async saveDocument(document: FiscalDocument): Promise<FiscalDocument> {
    await this.documentRef(document.tenantId, document.id).set(this.toStored(document));
    return document;
  }

  async findDocument(tenantId: string, id: string): Promise<FiscalDocument | undefined> {
    const snapshot = await this.documentRef(tenantId, id).get();
    return snapshot.exists ? this.fromStored(snapshot.data()) : undefined;
  }

  async findByIdempotency(tenantId: string, key: string): Promise<FiscalDocument | undefined> {
    const claim = await this.idempotencyRef(tenantId, key).get();
    if (!claim.exists) return undefined;
    return this.findDocument(tenantId, String(claim.data()?.['documentId']));
  }

  async listByTenant(tenantId: string): Promise<FiscalDocument[]> {
    const snapshot = await this.documents(tenantId).get();
    return snapshot.docs.map((doc: QueryDocumentSnapshot) => this.fromStored(doc.data()));
  }

  async search(tenantId: string, query: string, limit: number): Promise<FiscalDocument[]> {
    const terms = searchTerms(query).slice(0, 10);
    if (!terms.length) return [];
    const result = await this.documents(tenantId)
      .where('searchTokens', 'array-contains-any', terms)
      .limit(limit)
      .get();
    return result.docs.map((doc: QueryDocumentSnapshot) => this.fromStored(doc.data()));
  }

  async saveConfig(config: FiscalCompanyConfig): Promise<FiscalCompanyConfig> {
    await this.firestore.doc(`tenants/${config.companyId}/fiscal/config`).set(config);
    return config;
  }

  async findConfig(companyId: string): Promise<FiscalCompanyConfig | undefined> {
    const snapshot = await this.firestore.doc(`tenants/${companyId}/fiscal/config`).get();
    return snapshot.exists ? (snapshot.data() as FiscalCompanyConfig) : undefined;
  }

  async enqueueNfce(item: NfceContingencyItem): Promise<NfceContingencyItem> {
    await this.queueRef(item.tenantId, item.documentId).set(withoutUndefined(item));
    return item;
  }

  async findQueuedNfce(
    tenantId: string,
    documentId: string,
  ): Promise<NfceContingencyItem | undefined> {
    const snapshot = await this.queueRef(tenantId, documentId).get();
    return snapshot.exists ? (snapshot.data() as NfceContingencyItem) : undefined;
  }

  async listQueuedNfce(tenantId: string): Promise<NfceContingencyItem[]> {
    const snapshot = await this.firestore.collection(`tenants/${tenantId}/nfceContingency`).get();
    return snapshot.docs.map((doc: QueryDocumentSnapshot) => doc.data() as NfceContingencyItem);
  }

  async dequeueNfce(tenantId: string, documentId: string): Promise<void> {
    await this.queueRef(tenantId, documentId).delete();
  }

  /** Sem historico, comeca do numero do assistente. Com historico, segue a
   *  sequencia: o assistente so consegue empurrar para frente, nunca repetir. */
  private nextNumber(last: unknown, initialNumber: number | undefined): number {
    const start = initialNumber ?? 1;
    return typeof last === 'number' ? Math.max(last + 1, start) : start;
  }

  private documents(tenantId: string) {
    return this.firestore.collection(`tenants/${tenantId}/fiscalDocuments`);
  }

  private documentRef(tenantId: string, id: string) {
    return this.documents(tenantId).doc(id);
  }

  /** A chave vem do cliente e pode ter barra; o hash vira um id de documento valido. */
  private idempotencyRef(tenantId: string, key: string) {
    const id = createHash('sha256').update(key).digest('hex');
    return this.firestore.doc(`tenants/${tenantId}/fiscalIdempotency/${id}`);
  }

  /** A numeracao pertence ao emitente, que mora onde mora a config fiscal. */
  private sequenceRef(companyId: string, kind: 'NFE' | 'NFCE', series: number) {
    return this.firestore.doc(`tenants/${companyId}/fiscalSequences/${kind}-${series}`);
  }

  private queueRef(tenantId: string, documentId: string) {
    return this.firestore.doc(`tenants/${tenantId}/nfceContingency/${documentId}`);
  }

  private toStored(document: FiscalDocument): StoredDocument {
    return {
      ...withoutUndefined(document),
      searchTokens: searchTokens(
        `${document.accessKey ?? ''} ${document.number} ${document.series} ${document.kind}`,
      ),
    };
  }

  private fromStored(data: unknown): FiscalDocument {
    const { searchTokens: _tokens, ...document } = data as StoredDocument;
    return document;
  }
}
