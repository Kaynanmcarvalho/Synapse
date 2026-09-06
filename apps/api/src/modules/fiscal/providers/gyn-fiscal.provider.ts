import { Injectable, NotImplementedException, ServiceUnavailableException } from '@nestjs/common';
import type {
  FiscalConsultResult,
  FiscalEventCommand,
  FiscalIssueCommand,
  FiscalProvider,
  FiscalProviderResult,
} from '@synapse/types';

type Json = Record<string, unknown>;
@Injectable()
export class GynFiscalProvider implements FiscalProvider {
  private readonly baseUrl = 'https://gynfiscal.up.railway.app/api/v1';
  constructor(
    private readonly apiKey: string,
    private readonly tenantId: string,
  ) {}
  issueNFe(command: FiscalIssueCommand) {
    return this.post('/fiscal/nfe/emitir', command.payload);
  }
  issueNFCe(command: FiscalIssueCommand) {
    return this.post('/fiscal/nfce/emitir', command.payload);
  }
  cancelDocument(command: FiscalEventCommand) {
    return this.post('/fiscal/nfe/cancelar', {
      chave: command.accessKey,
      protocolo: command.protocol,
      justificativa: command.justification,
    });
  }
  cancelNFCe(command: FiscalEventCommand) {
    return this.post('/fiscal/nfce/cancelar', {
      chave: command.accessKey,
      protocolo: command.protocol,
      justificativa: command.justification,
    });
  }
  correctNFe(): Promise<FiscalProviderResult> {
    throw new NotImplementedException(
      'A documentação Gyn Fiscal consultada não publica endpoint de criação de CC-e',
    );
  }
  async consultDocument(accessKey: string): Promise<FiscalConsultResult> {
    const raw = await this.json(`/fiscal/nfe/consultar/${accessKey}`);
    return { ...this.map(raw), raw };
  }
  async downloadXml(providerId: string) {
    return (await this.request(`/fiscal/nfe/${providerId}/xml`)).text();
  }
  async downloadNFCeXml(providerId: string, contingency = false) {
    const suffix = contingency ? '/xml/contingencia' : '/xml';
    return (await this.request(`/fiscal/nfce/${providerId}${suffix}`)).text();
  }
  async getDanfe(xml: string) {
    const response = await this.request('/fiscal/nfe/danfe', {
      method: 'POST',
      body: JSON.stringify({ xml }),
    });
    return new Uint8Array(await response.arrayBuffer());
  }
  async getNFCeDanfe(xml: string) {
    const response = await this.request('/fiscal/nfce/danfe', {
      method: 'POST',
      body: JSON.stringify({ xml }),
    });
    return new Uint8Array(await response.arrayBuffer());
  }
  async queryDFe(query: Readonly<Json>) {
    const raw = await this.json('/fiscal/nfe/distribuicao/nfe', {
      method: 'POST',
      body: JSON.stringify(query),
    });
    return (Array.isArray(raw.documentos) ? raw.documentos : []).map((item) => ({
      ...this.map(item as Json),
      raw: item as Json,
    }));
  }
  async manifestDFe(payload: Json) {
    return this.post('/fiscal/nfe/distribuicao/nfe/manifestacoes', payload);
  }
  issueMDFe(command: FiscalIssueCommand) {
    return this.post('/fiscal/mdfe/emitir', command.payload);
  }
  async invalidateNFe(payload: Json) {
    return this.post('/fiscal/nfe/inutilizar', payload);
  }
  async checkJob(jobId: string) {
    return this.json(`/fiscal/nfe/job/${jobId}`);
  }
  async checkNFCeJob(jobId: string) {
    return this.map(await this.json(`/fiscal/nfce/job/${jobId}`));
  }
  private async post(path: string, payload: Json) {
    return this.map(await this.json(path, { method: 'POST', body: JSON.stringify(payload) }));
  }
  private async json(path: string, init?: RequestInit): Promise<Json> {
    return (await (await this.request(path, init)).json()) as Json;
  }
  private async request(path: string, init: RequestInit = {}) {
    const response = await fetch(`${this.baseUrl}${path}`, {
      ...init,
      headers: {
        'content-type': 'application/json',
        'x-api-key': this.apiKey,
        'x-tenant-id': this.tenantId,
        ...init.headers,
      },
    });
    if (!response.ok)
      throw new ServiceUnavailableException(`Gyn Fiscal respondeu HTTP ${response.status}`);
    return response;
  }
  private map(raw: Json): FiscalProviderResult {
    const text = (name: string) => (typeof raw[name] === 'string' ? (raw[name] as string) : null);
    const status = (text('situacao') ?? text('status') ?? text('statusJob'))?.toUpperCase();
    return {
      status: this.mapStatus(status),
      providerId: text('id') ?? text('jobId') ?? '',
      jobId: text('jobId'),
      accessKey: text('chave') ?? text('chaveAcesso'),
      protocol: text('protocolo'),
      xml: text('xml'),
      code: String(raw.codigoStatus ?? raw.codigo ?? ''),
      message: text('motivoStatus') ?? text('mensagem'),
    };
  }
  private mapStatus(status: string | undefined): FiscalProviderResult['status'] {
    if (status === 'AUTORIZADA' || status === 'CONCLUIDO' || status === 'COMPLETED')
      return 'AUTHORIZED';
    if (status === 'CANCELADA') return 'CANCELLED';
    if (status === 'CONTINGENCIA_PENDENTE') return 'CONTINGENCY';
    if (status === 'REJEITADA' || status === 'FAILED') return 'REJECTED';
    return 'PROCESSING';
  }
}
