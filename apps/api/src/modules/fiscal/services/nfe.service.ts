import {
  BadRequestException,
  HttpException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import type { FiscalDocument, FiscalProvider, FiscalProviderResult } from '@synapse/types';
import { randomUUID } from 'node:crypto';
import type { FiscalEventInput, InvalidateNfeInput, IssueNfeInput } from '../dto/fiscal.schemas';
import { assertOwnCompany } from '../entities/fiscal-company';
import { assertFiscalTransition } from '../entities/fiscal-state-machine';
import { FiscalRepository } from '../repositories/fiscal.repository';
import { FiscalProviderRegistry } from './fiscal-provider.registry';

@Injectable()
export class NfeService {
  private readonly logger = new Logger(NfeService.name);
  constructor(
    private readonly repository: FiscalRepository,
    private readonly providers: FiscalProviderRegistry,
  ) {}
  async issue(tenantId: string, input: IssueNfeInput): Promise<FiscalDocument> {
    assertOwnCompany(tenantId, input.companyId);
    const existing = await this.repository.findByIdempotency(tenantId, input.idempotencyKey);
    if (existing) return existing;
    const { config, provider } = await this.context(input.companyId);
    const { document: draft, replayed } = await this.repository.reserveDocument(
      {
        id: randomUUID(),
        tenantId,
        companyId: input.companyId,
        kind: 'NFE',
        environment: config.environment,
        status: 'PROCESSING',
        series: config.nfeSeries,
        accessKey: null,
        protocol: null,
        providerJobId: null,
        xml: null,
        sefazCode: null,
        sefazMessage: null,
        attempts: 0,
        idempotencyKey: input.idempotencyKey,
        issuedAt: null,
      },
      // Quem migra de outro sistema informa no assistente de onde a serie continua.
      {
        companyId: input.companyId,
        kind: 'NFE',
        series: config.nfeSeries,
        initialNumber: config.nfe?.nextNumber,
      },
    );
    // Outra requisicao com a mesma chave chegou antes: a nota e a dela.
    if (replayed) return draft;
    const { number } = draft;
    // So a chamada ao provedor vira rejeicao. Falha ao gravar a resposta nao pode
    // marcar como rejeitada uma nota que a SEFAZ autorizou.
    let result: FiscalProviderResult;
    try {
      result = await this.retry(() =>
        provider.issueNFe({
          companyId: input.companyId,
          referenceId: input.referenceId,
          series: config.nfeSeries,
          number,
          payload: { ...input.payload, numero: number, serie: config.nfeSeries },
          idempotencyKey: input.idempotencyKey,
        }),
      );
    } catch (error) {
      const sefazMessage = this.readableError(error);
      this.logger.warn(
        JSON.stringify({
          event: 'nfe_rejected',
          documentId: draft.id,
          companyId: input.companyId,
          series: draft.series,
          number: draft.number,
          message: sefazMessage,
        }),
      );
      return this.repository.saveDocument({
        ...draft,
        status: 'REJECTED',
        attempts: 3,
        sefazMessage,
      });
    }
    return this.apply(draft, result);
  }
  async consult(tenantId: string, documentId: string) {
    const { document, provider } = await this.documentContext(tenantId, documentId);
    if (!document.accessKey) return document;
    return this.apply(document, await provider.consultDocument(document.accessKey));
  }
  async cancel(tenantId: string, documentId: string, input: FiscalEventInput) {
    const { document, provider } = await this.documentContext(tenantId, documentId);
    if (!document.accessKey || !document.protocol || !document.issuedAt)
      throw new BadRequestException('NF-e ainda não autorizada');
    const elapsedHours = (Date.now() - new Date(document.issuedAt).getTime()) / 3_600_000;
    if (elapsedHours > 24)
      throw new BadRequestException('Prazo operacional de cancelamento de 24 horas excedido');
    return this.apply(
      document,
      await provider.cancelDocument({
        companyId: document.companyId,
        accessKey: document.accessKey,
        protocol: document.protocol,
        justification: input.justification,
        idempotencyKey: input.idempotencyKey,
      }),
    );
  }
  async correct(tenantId: string, documentId: string, input: FiscalEventInput) {
    const { document, provider } = await this.documentContext(tenantId, documentId);
    if (!document.accessKey || !document.protocol)
      throw new BadRequestException('NF-e ainda não autorizada');
    await provider.correctNFe({
      companyId: document.companyId,
      accessKey: document.accessKey,
      protocol: document.protocol,
      justification: input.justification,
      idempotencyKey: input.idempotencyKey,
    });
    return document;
  }
  async xml(tenantId: string, documentId: string) {
    const { document, provider } = await this.documentContext(tenantId, documentId);
    return document.xml ?? provider.downloadXml(document.id);
  }
  async danfe(tenantId: string, documentId: string) {
    const { provider } = await this.documentContext(tenantId, documentId);
    return provider.getDanfe(await this.xml(tenantId, documentId));
  }
  async invalidate(tenantId: string, input: InvalidateNfeInput) {
    assertOwnCompany(tenantId, input.companyId);
    const { provider } = await this.context(input.companyId);
    const capable = provider as FiscalProvider & {
      invalidateNFe?: (payload: Record<string, unknown>) => Promise<FiscalProviderResult>;
    };
    if (!capable.invalidateNFe)
      return { status: 'AUTHORIZED', message: 'Faixa inutilizada no ambiente MOCK' };
    return capable.invalidateNFe({
      serie: input.series,
      numeroInicial: input.firstNumber,
      numeroFinal: input.lastNumber,
      justificativa: input.justification,
    });
  }
  private async context(companyId: string) {
    const config = await this.repository.findConfig(companyId);
    if (!config) throw new NotFoundException('Configuração fiscal da empresa não encontrada');
    return { config, provider: await this.providers.resolve(config) };
  }
  private async documentContext(tenantId: string, id: string) {
    const document = await this.repository.findDocument(tenantId, id);
    if (!document) throw new NotFoundException('Documento fiscal não encontrado');
    return { document, provider: (await this.context(document.companyId)).provider };
  }
  private apply(document: FiscalDocument, result: FiscalProviderResult) {
    if (document.status !== result.status) assertFiscalTransition(document.status, result.status);
    return this.repository.saveDocument({
      ...document,
      status: result.status,
      accessKey: result.accessKey,
      protocol: result.protocol,
      providerJobId: result.jobId,
      xml: result.xml,
      sefazCode: result.code,
      sefazMessage: result.message,
      attempts: document.attempts + 1,
      issuedAt: result.status === 'AUTHORIZED' ? new Date().toISOString() : document.issuedAt,
    });
  }
  private async retry<T>(operation: () => Promise<T>): Promise<T> {
    let last: unknown;
    for (let attempt = 0; attempt < 3; attempt += 1) {
      try {
        return await operation();
      } catch (error) {
        last = error;
        // Recusa do provedor (4xx: dado invalido, credencial) nao muda tentando de novo.
        if (error instanceof HttpException && error.getStatus() < 500) break;
      }
    }
    throw last;
  }
  private readableError(error: unknown) {
    return error instanceof Error
      ? `Não foi possível autorizar a NF-e: ${error.message}`
      : 'Não foi possível autorizar a NF-e';
  }
}
