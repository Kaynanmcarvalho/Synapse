import {
  HttpException,
  HttpStatus,
  Injectable,
  Logger,
  NotImplementedException,
} from '@nestjs/common';
import type {
  FiscalConsultResult,
  FiscalEventCommand,
  FiscalIssueCommand,
  FiscalProvider,
  FiscalProviderResult,
} from '@synapse/types';

type Json = Record<string, unknown>;
export interface JobPolling {
  readonly attempts: number;
  readonly intervalMs: number;
}
const delay = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms));

@Injectable()
export class GynFiscalProvider implements FiscalProvider {
  private readonly logger = new Logger(GynFiscalProvider.name);
  private readonly baseUrl = 'https://gynfiscal.up.railway.app/api/v1';
  constructor(
    private readonly apiKey: string,
    private readonly tenantId: string,
    /** Consulta do job assincrono; o teste automatizado usa valores curtos. */
    private readonly job: JobPolling = { attempts: 15, intervalMs: 2000 },
  ) {}
  async issueNFe(command: FiscalIssueCommand) {
    return this.waitForNFeJob(await this.post('/fiscal/nfe/emitir', command.payload));
  }
  issueNFCe(command: FiscalIssueCommand) {
    return this.post('/fiscal/nfce/emitir', command.payload);
  }
  /** O ambiente vem da chave da API: o Gyn recusa quando o informado nao bate.
   *  Trava antes de emitir a nota de teste com uma chave de producao. */
  async assertHomologationEnvironment(): Promise<void> {
    await this.request('/fiscal/nfe/listar?ambiente=homologacao&$top=1');
  }
  async cancelDocument(command: FiscalEventCommand) {
    return this.waitForNFeJob(
      await this.post('/fiscal/nfe/cancelar', {
        chaveAcesso: command.accessKey,
        protocolo: command.protocol,
        justificativa: command.justification,
      }),
    );
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
  closeMDFe(id: string, payload: Json) {
    return this.post(`/fiscal/mdfe/${id}/encerrar`, payload);
  }
  cancelMDFe(id: string, payload: Json) {
    return this.post(`/fiscal/mdfe/${id}/cancelar`, payload);
  }
  async checkMDFeJob(id: string) {
    return this.map(await this.json(`/fiscal/mdfe/job/${id}`));
  }
  async getDamdfe(id: string) {
    return new Uint8Array(await (await this.request(`/fiscal/mdfe/${id}/damdfe`)).arrayBuffer());
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
  /** Emissao e cancelamento sao assincronos: o POST devolve `jobId` e o resultado
   *  da SEFAZ so aparece quando o job termina (`concluido` ou `erro`). */
  private async waitForNFeJob(started: FiscalProviderResult): Promise<FiscalProviderResult> {
    const jobId = started.jobId;
    if (!jobId) return started;
    for (let attempt = 0; attempt < this.job.attempts; attempt += 1) {
      await delay(this.job.intervalMs);
      const job = await this.json(`/fiscal/nfe/job/${jobId}`);
      const state = String(job.status ?? '').toLowerCase();
      if (state !== 'concluido' && state !== 'erro') continue;
      const result =
        job.resultado && typeof job.resultado === 'object' ? (job.resultado as Json) : {};
      return this.map({ ...job, ...result, jobId });
    }
    throw new HttpException(
      `O Gyn Fiscal não devolveu o resultado do job ${jobId} dentro de ${(this.job.attempts * this.job.intervalMs) / 1000}s.`,
      HttpStatus.GATEWAY_TIMEOUT,
    );
  }
  /** O Gyn responde `{ sucesso, dados: {...} }`: os campos que interessam vem em `dados`. */
  private async json(path: string, init?: RequestInit): Promise<Json> {
    const body = (await (await this.request(path, init)).json()) as Json;
    const data = body.dados;
    return data && typeof data === 'object' && !Array.isArray(data)
      ? { ...body, ...(data as Json) }
      : body;
  }
  /** Falha do Gyn sai com o motivo que ele devolveu e fica no log da API. Nunca
   *  registra cabecalhos (chave da API) nem o payload enviado. */
  private async request(path: string, init: RequestInit = {}) {
    const method = init.method ?? 'GET';
    let response: Response;
    try {
      response = await fetch(`${this.baseUrl}${path}`, {
        ...init,
        headers: {
          'content-type': 'application/json',
          'x-api-key': this.apiKey,
          'x-tenant-id': this.tenantId,
          ...init.headers,
        },
      });
    } catch (error) {
      const message = `Sem conexão com o Gyn Fiscal: ${error instanceof Error ? error.message : String(error)}`;
      this.logger.error(JSON.stringify({ event: 'gyn_fiscal_unreachable', method, path, message }));
      throw new HttpException(message, HttpStatus.BAD_GATEWAY);
    }
    if (!response.ok) {
      const message = gynErrorMessage(response.status, await response.text().catch(() => ''));
      this.logger.warn(
        JSON.stringify({
          event: 'gyn_fiscal_error',
          method,
          path,
          status: response.status,
          message,
        }),
      );
      throw new HttpException(
        message,
        response.status >= 500 ? HttpStatus.BAD_GATEWAY : HttpStatus.UNPROCESSABLE_ENTITY,
      );
    }
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
      code: String(raw.codigoStatus ?? raw.codigoRejeicao ?? raw.codigo ?? ''),
      message:
        text('motivoStatus') ?? text('motivo') ?? text('mensagemUsuario') ?? text('mensagem'),
    };
  }
  private mapStatus(status: string | undefined): FiscalProviderResult['status'] {
    if (status === 'AUTORIZADA' || status === 'CONCLUIDO' || status === 'COMPLETED')
      return 'AUTHORIZED';
    if (status === 'CANCELADA' || status === 'CANCELADO') return 'CANCELLED';
    if (status === 'CONTINGENCIA_PENDENTE') return 'CONTINGENCY';
    if (status === 'DENEGADA') return 'DENIED';
    if (
      status === 'REJEITADA' ||
      status === 'REJEITADO' ||
      status === 'FAILED' ||
      status === 'ERRO'
    )
      return 'REJECTED';
    return 'PROCESSING';
  }
}

const text = (value: unknown): string | null =>
  typeof value === 'string' && value.trim() ? value.trim() : null;

/** `campos` do ValidationError do Gyn: lista de textos, de `{ campo, mensagem }` ou objeto. */
const describeFields = (fields: unknown): string | null => {
  const entries = Array.isArray(fields)
    ? fields.map((field) =>
        field && typeof field === 'object'
          ? [text((field as Json).campo), text((field as Json).mensagem)].filter(Boolean).join(': ')
          : (text(field) ?? ''),
      )
    : fields && typeof fields === 'object'
      ? Object.entries(fields as Json).map(
          ([key, value]) => `${key}: ${text(value) ?? JSON.stringify(value)}`,
        )
      : [];
  const filled = entries.filter(Boolean);
  return filled.length > 0 ? filled.join('; ') : null;
};

/** Corpo de erro do Gyn: `{ sucesso: false, codigo, mensagemUsuario, mensagemTecnica, campos }`. */
export const gynErrorMessage = (status: number, body: string): string => {
  let parsed: Json = {};
  try {
    const value: unknown = JSON.parse(body);
    if (value && typeof value === 'object') parsed = value as Json;
  } catch {
    parsed = {};
  }
  const messages = [
    text(parsed.mensagemUsuario) ?? text(parsed.mensagem) ?? text(parsed.message),
    text(parsed.mensagemTecnica),
  ].filter(
    (message, index, all): message is string => Boolean(message) && all.indexOf(message) === index,
  );
  const code = text(parsed.codigo);
  const fields = describeFields(parsed.campos);
  const detail = messages.join(' — ') || body.trim().slice(0, 300) || 'sem detalhes';
  return `Gyn Fiscal respondeu HTTP ${status}${code ? ` (${code})` : ''}: ${detail}${fields ? `. Campos: ${fields}` : ''}`;
};
