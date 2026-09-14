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
import { assertOwnCompany } from '../entities/fiscal-company';
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
    assertOwnCompany(tenantId, companyId);
    const idempotencyKey = `pos-nfce:${sale.id}`;
    const existing = await this.repository.findByIdempotency(tenantId, idempotencyKey);
    if (existing) return existing.id;
    const { config, provider } = await this.context(companyId);
    if (config.provider !== 'MOCK' && (!config.cscId || !config.cscSecretRef))
      throw new BadRequestException('CSC e identificador do CSC são obrigatórios para NFC-e');

    const { document: draft, replayed } = await this.repository.reserveDocument(
      {
        id: randomUUID(),
        tenantId,
        companyId,
        kind: 'NFCE',
        environment: config.environment,
        status: 'PROCESSING',
        series: config.nfceSeries,
        accessKey: null,
        protocol: null,
        providerJobId: null,
        xml: null,
        sefazCode: null,
        sefazMessage: null,
        attempts: 0,
        idempotencyKey,
        issuedAt: null,
      },
      {
        companyId,
        kind: 'NFCE',
        series: config.nfceSeries,
        initialNumber: config.nfce?.series.find((row) => row.series === config.nfceSeries)
          ?.nextNumber,
      },
    );
    // A mesma venda fechada duas vezes ao mesmo tempo: fica a nota de quem chegou antes.
    if (replayed) return draft.id;
    const payload = this.salePayload(sale, draft.series, draft.number);
    // So a falha do provedor leva para a contingencia. Falha ao gravar a resposta
    // nao pode reenviar em contingencia uma nota que ja foi autorizada.
    let result: FiscalProviderResult;
    try {
      result = await provider.issueNFCe({
        companyId,
        referenceId: sale.id,
        number: draft.number,
        series: draft.series,
        payload,
        idempotencyKey,
      });
    } catch (error) {
      if (config.nfceContingencyEnabled === false) throw error;
      return this.issueInContingency(draft, sale.id, payload, provider);
    }
    return (await this.apply(draft, result)).id;
  }

  async consult(tenantId: string, documentId: string) {
    const { document, provider } = await this.documentContext(tenantId, documentId);
    if (document.providerJobId && provider.checkNFCeJob) {
      const result = await provider.checkNFCeJob(document.providerJobId);
      if (result) return this.finishQueued(document, result);
    }
    if (!document.accessKey) return document;
    return this.finishQueued(document, await provider.consultDocument(document.accessKey));
  }

  async retryContingency(tenantId: string, documentId: string, input: RetryNfceInput) {
    const queued = await this.repository.findQueuedNfce(tenantId, documentId);
    if (!queued) throw new NotFoundException('NFC-e não está na fila de contingência');
    const { document, provider } = await this.documentContext(tenantId, documentId);
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

  async cancel(tenantId: string, documentId: string, input: FiscalEventInput) {
    const { document, provider, config } = await this.documentContext(tenantId, documentId);
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

  async xml(tenantId: string, documentId: string) {
    const { document, provider } = await this.documentContext(tenantId, documentId);
    if (document.xml) return document.xml;
    if (provider.downloadNFCeXml)
      return provider.downloadNFCeXml(
        document.providerJobId ?? document.id,
        document.status === 'CONTINGENCY',
      );
    return provider.downloadXml(document.providerJobId ?? document.id);
  }

  async print(tenantId: string, documentId: string) {
    const { provider } = await this.documentContext(tenantId, documentId);
    const xml = await this.xml(tenantId, documentId);
    const danfe = provider.getNFCeDanfe
      ? await provider.getNFCeDanfe(xml)
      : await provider.getDanfe(xml);
    return { danfe, qrCodeUrl: this.qrCode(xml) };
  }

  private async issueInContingency(
    draft: FiscalDocument,
    saleId: string,
    payload: ReturnType<NfceService['salePayload']>,
    provider: NfceProvider,
  ): Promise<string> {
    const idempotencyKey = `${draft.idempotencyKey}:contingency`;
    const contingencyPayload = {
      ...payload,
      formaEmissao: 'contingencia_offline',
      justificativaContingencia: 'Indisponibilidade de comunicação com a SEFAZ',
      dataHoraContingencia: new Date().toISOString(),
    };
    const document = await this.apply(
      draft,
      await provider.issueNFCe({
        companyId: draft.companyId,
        referenceId: saleId,
        number: draft.number,
        series: draft.series,
        payload: contingencyPayload,
        idempotencyKey,
      }),
      'CONTINGENCY',
    );
    await this.repository.enqueueNfce({
      documentId: document.id,
      tenantId: document.tenantId,
      companyId: document.companyId,
      payload: contingencyPayload,
      idempotencyKey,
      queuedAt: new Date().toISOString(),
    });
    return document.id;
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

  private async context(companyId: string) {
    const config = await this.repository.findConfig(companyId);
    if (!config) throw new NotFoundException('Configuração fiscal da empresa não encontrada');
    return { config, provider: (await this.providers.resolve(config)) as NfceProvider };
  }

  private async documentContext(tenantId: string, id: string) {
    const document = await this.repository.findDocument(tenantId, id);
    if (!document || document.kind !== 'NFCE') throw new NotFoundException('NFC-e não encontrada');
    return { document, ...(await this.context(document.companyId)) };
  }

  private async finishQueued(document: FiscalDocument, result: FiscalProviderResult) {
    const saved = await this.apply(document, result);
    if (saved.status === 'AUTHORIZED' || saved.status === 'REJECTED')
      await this.repository.dequeueNfce(saved.tenantId, saved.id);
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
