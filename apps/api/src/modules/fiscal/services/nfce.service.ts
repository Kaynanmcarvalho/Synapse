import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import type {
  FiscalDocument,
  FiscalEventCommand,
  FiscalProvider,
  FiscalProviderResult,
  PosSale,
} from '@synapse/types';
import { randomUUID } from 'node:crypto';
import type { FiscalEventInput, RetryNfceInput } from '../dto/fiscal.schemas';
import { assertFiscalTransition } from '../entities/fiscal-state-machine';
import { FiscalRepository } from '../repositories/fiscal.repository';
import { FiscalProviderRegistry } from './fiscal-provider.registry';

type NfceProvider = FiscalProvider & {
  cancelNFCe?: (command: FiscalEventCommand) => Promise<FiscalProviderResult>;
  downloadNFCeXml?: (providerId: string, contingency?: boolean) => Promise<string>;
  getNFCeDanfe?: (xml: string) => Promise<Uint8Array>;
  checkNFCeJob?: (jobId: string) => Promise<FiscalProviderResult | null>;
};

@Injectable()
export class NfceService {
  constructor(
    private readonly repository: FiscalRepository,
    private readonly providers: FiscalProviderRegistry,
  ) {}

  async issueNfce(
    tenantId: string,
    companyId: string,
    sale: Omit<PosSale, 'nfceDocumentId'>,
  ): Promise<string> {
    const idempotencyKey = `pos-nfce:${sale.id}`;
    const existing = this.repository.findByIdempotency(idempotencyKey);
    if (existing) return existing.id;
    const { config, provider } = this.context(companyId);
    if (config.provider !== 'MOCK' && (!config.cscId || !config.cscSecretRef))
      throw new BadRequestException('CSC e identificador do CSC são obrigatórios para NFC-e');

    const number = this.repository.nextNumber(
      companyId,
      'NFCE',
      config.nfceSeries,
      config.nfce?.series.find((row) => row.series === config.nfceSeries)?.nextNumber,
    );
    const payload = this.salePayload(sale, config.nfceSeries, number);
    const draft: FiscalDocument = {
      id: randomUUID(),
      tenantId,
      companyId,
      kind: 'NFCE',
      environment: config.environment,
      status: 'PROCESSING',
      series: config.nfceSeries,
      number,
      accessKey: null,
      protocol: null,
      providerJobId: null,
      xml: null,
      sefazCode: null,
      sefazMessage: null,
      attempts: 0,
      idempotencyKey,
      issuedAt: null,
    };
    this.repository.saveDocument(draft);
    try {
      const result = await provider.issueNFCe({
        companyId,
        referenceId: sale.id,
        number,
        series: config.nfceSeries,
        payload,
        idempotencyKey,
      });
      return this.apply(draft, result).id;
    } catch (error) {
      if (config.nfceContingencyEnabled === false) throw error;
      const contingencyPayload = {
        ...payload,
        formaEmissao: 'contingencia_offline',
        justificativaContingencia: 'Indisponibilidade de comunicação com a SEFAZ',
        dataHoraContingencia: new Date().toISOString(),
      };
      const document = this.apply(
        draft,
        await provider.issueNFCe({
          companyId,
          referenceId: sale.id,
          number,
          series: config.nfceSeries,
          payload: contingencyPayload,
          idempotencyKey: `${idempotencyKey}:contingency`,
        }),
        'CONTINGENCY',
      );
      this.repository.enqueueNfce({
        documentId: document.id,
        companyId,
        payload: contingencyPayload,
        idempotencyKey: `${idempotencyKey}:contingency`,
        queuedAt: new Date().toISOString(),
      });
      return document.id;
    }
  }

  async consult(documentId: string) {
    const { document, provider } = this.documentContext(documentId);
    if (document.providerJobId && provider.checkNFCeJob) {
      const result = await provider.checkNFCeJob(document.providerJobId);
      if (result) return this.finishQueued(document, result);
    }
    if (!document.accessKey) return document;
    return this.finishQueued(document, await provider.consultDocument(document.accessKey));
  }

  async retryContingency(documentId: string, input: RetryNfceInput) {
    const queued = this.repository.findQueuedNfce(documentId);
    if (!queued) throw new NotFoundException('NFC-e não está na fila de contingência');
    const { document, provider } = this.documentContext(documentId);
    if (document.providerJobId && provider.checkNFCeJob) {
      const result = await provider.checkNFCeJob(document.providerJobId);
      if (result) return this.finishQueued(document, result);
    }
    const result = await provider.issueNFCe({
      companyId: queued.companyId,
      referenceId: document.id,
      number: document.number,
      series: document.series,
      payload: queued.payload,
      idempotencyKey: input.idempotencyKey,
    });
    return this.finishQueued(document, result);
  }

  async cancel(documentId: string, input: FiscalEventInput) {
    const { document, provider, config } = this.documentContext(documentId);
    if (!document.accessKey || !document.protocol || !document.issuedAt)
      throw new BadRequestException('NFC-e ainda não autorizada');
    const elapsedMinutes = (Date.now() - new Date(document.issuedAt).getTime()) / 60_000;
    if (elapsedMinutes > (config.nfceCancellationWindowMinutes ?? 30))
      throw new BadRequestException('Prazo operacional de cancelamento da NFC-e excedido');
    const command = {
      companyId: document.companyId,
      accessKey: document.accessKey,
      protocol: document.protocol,
      justification: input.justification,
      idempotencyKey: input.idempotencyKey,
    };
    return this.apply(
      document,
      provider.cancelNFCe
        ? await provider.cancelNFCe(command)
        : await provider.cancelDocument(command),
    );
  }

  async xml(documentId: string) {
    const { document, provider } = this.documentContext(documentId);
    if (document.xml) return document.xml;
    if (provider.downloadNFCeXml)
      return provider.downloadNFCeXml(
        document.providerJobId ?? document.id,
        document.status === 'CONTINGENCY',
      );
    return provider.downloadXml(document.providerJobId ?? document.id);
  }

  async print(documentId: string) {
    const { provider } = this.documentContext(documentId);
    const xml = await this.xml(documentId);
    const danfe = provider.getNFCeDanfe
      ? await provider.getNFCeDanfe(xml)
      : await provider.getDanfe(xml);
    return { danfe, qrCodeUrl: this.qrCode(xml) };
  }

  private salePayload(sale: Omit<PosSale, 'nfceDocumentId'>, series: number, number: number) {
    return {
      referencia: sale.id,
      serie: series,
      numero: number,
      consumidor: sale.customerTaxId ? { cpfCnpj: sale.customerTaxId } : undefined,
      itens: sale.items.map((item, index) => ({
        numeroItem: index + 1,
        codigo: item.productId,
        codigoBarras: item.barcode ?? undefined,
        descricao: item.description,
        quantidade: item.quantity / 1000,
        valorUnitario: item.unitPrice / 100,
        desconto: item.discount / 100,
        acrescimo: item.surcharge / 100,
      })),
      pagamentos: sale.payments.map((payment) => ({
        meio: payment.method,
        valor: payment.amount / 100,
        referencia: payment.reference ?? undefined,
      })),
      valorTotal: sale.total / 100,
    };
  }

  private context(companyId: string) {
    const config = this.repository.findConfig(companyId);
    if (!config) throw new NotFoundException('Configuração fiscal da empresa não encontrada');
    return { config, provider: this.providers.resolve(config) as NfceProvider };
  }

  private documentContext(id: string) {
    const document = this.repository.findDocument(id);
    if (!document || document.kind !== 'NFCE') throw new NotFoundException('NFC-e não encontrada');
    return { document, ...this.context(document.companyId) };
  }

  private finishQueued(document: FiscalDocument, result: FiscalProviderResult) {
    const saved = this.apply(document, result);
    if (saved.status === 'AUTHORIZED' || saved.status === 'REJECTED')
      this.repository.dequeueNfce(saved.id);
    return saved;
  }

  private apply(
    document: FiscalDocument,
    result: FiscalProviderResult,
    fallbackStatus?: FiscalDocument['status'],
  ) {
    const status =
      result.status === 'PROCESSING' && fallbackStatus ? fallbackStatus : result.status;
    if (document.status !== status) assertFiscalTransition(document.status, status);
    return this.repository.saveDocument({
      ...document,
      status,
      accessKey: result.accessKey ?? document.accessKey,
      protocol: result.protocol ?? document.protocol,
      providerJobId: result.jobId ?? result.providerId ?? document.providerJobId,
      xml: result.xml ?? document.xml,
      sefazCode: result.code,
      sefazMessage: result.message,
      attempts: document.attempts + 1,
      issuedAt: status === 'AUTHORIZED' ? new Date().toISOString() : document.issuedAt,
    });
  }

  private qrCode(xml: string): string | null {
    const match = xml.match(/<qrCode(?:\s[^>]*)?>(?:<!\[CDATA\[)?([\s\S]*?)(?:\]\]>)?<\/qrCode>/i);
    if (!match?.[1]) return null;
    return match[1]
      .trim()
      .replace(/&amp;/g, '&')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&quot;/g, '"')
      .replace(/&#39;/g, "'");
  }
}
