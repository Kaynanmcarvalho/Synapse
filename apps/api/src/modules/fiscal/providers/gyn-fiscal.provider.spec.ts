import { Logger } from '@nestjs/common';
import type { FiscalEventCommand, FiscalIssueCommand } from '@synapse/types';
import { GynFiscalProvider, gynErrorMessage } from './gyn-fiscal.provider';

const command: FiscalIssueCommand = {
  companyId: 'tenant-1',
  referenceId: 'venda-1',
  number: 1,
  series: 1,
  payload: { naturezaOperacao: 'VENDA DE MERCADORIA' },
  idempotencyKey: 'emitir-venda-1',
};

const evento: FiscalEventCommand = {
  companyId: 'tenant-1',
  accessKey: '52260938242542000143550010000031581000031586',
  protocol: '352260000123456',
  justification: 'Cancelamento automático do teste de homologação',
  idempotencyKey: 'cancelar-venda-1',
};

const resposta = (status: number, corpo: unknown) => ({
  ok: status < 400,
  status,
  text: () => Promise.resolve(JSON.stringify(corpo)),
  json: () => Promise.resolve(corpo),
});

/** Sem espera entre as consultas do job. */
const provedor = (fetchMock: jest.Mock) => {
  globalThis.fetch = fetchMock as unknown as typeof fetch;
  return new GynFiscalProvider('chave-secreta', 'tenant-gyn', { attempts: 3, intervalMs: 0 });
};

const urlsChamadas = (fetchMock: jest.Mock) => fetchMock.mock.calls.map((call) => String(call[0]));
const corpoEnviado = (fetchMock: jest.Mock, indice: number) =>
  JSON.parse(String((fetchMock.mock.calls[indice]?.[1] as RequestInit).body)) as Record<
    string,
    unknown
  >;

describe('GynFiscalProvider', () => {
  const fetchOriginal = globalThis.fetch;
  afterEach(() => {
    globalThis.fetch = fetchOriginal;
    jest.restoreAllMocks();
  });

  it('monta a mensagem com o corpo de erro do Gyn', () => {
    const corpo = JSON.stringify({
      sucesso: false,
      codigo: 'VALIDATION_ERROR',
      mensagemUsuario: 'Dados inválidos. Verifique os campos enviados.',
      mensagemTecnica: 'emitente é obrigatório',
      campos: [{ campo: 'emitente', mensagem: 'obrigatório' }],
    });
    expect(gynErrorMessage(400, corpo)).toBe(
      'Gyn Fiscal respondeu HTTP 400 (VALIDATION_ERROR): Dados inválidos. Verifique os campos enviados. — emitente é obrigatório. Campos: emitente: obrigatório',
    );
  });

  it('corpo que não é JSON vai resumido', () => {
    expect(gynErrorMessage(502, '<html>Bad Gateway</html>')).toBe(
      'Gyn Fiscal respondeu HTTP 502: <html>Bad Gateway</html>',
    );
  });

  it('lança com o motivo e registra no log, sem expor a chave da API', async () => {
    const warn = jest.spyOn(Logger.prototype, 'warn').mockImplementation(() => undefined);
    const fetchMock = jest.fn().mockResolvedValue(
      resposta(400, {
        sucesso: false,
        codigo: 'VALIDATION_ERROR',
        mensagemUsuario: 'Dados inválidos.',
      }),
    );

    await expect(provedor(fetchMock).issueNFe(command)).rejects.toThrow(
      'Gyn Fiscal respondeu HTTP 400 (VALIDATION_ERROR): Dados inválidos.',
    );
    expect(warn).toHaveBeenCalledTimes(1);
    expect(String(warn.mock.calls[0]?.[0])).not.toContain('chave-secreta');
  });

  it('acompanha o job até a autorização da SEFAZ', async () => {
    const fetchMock = jest
      .fn()
      .mockResolvedValueOnce(resposta(202, { sucesso: true, dados: { jobId: 'job-1' } }))
      .mockResolvedValueOnce(resposta(200, { sucesso: true, dados: { status: 'pendente' } }))
      .mockResolvedValueOnce(
        resposta(200, {
          sucesso: true,
          dados: {
            status: 'concluido',
            resultado: {
              status: 'autorizada',
              chaveAcesso: evento.accessKey,
              protocolo: evento.protocol,
              motivo: 'Autorizado o uso da NF-e',
            },
          },
        }),
      );

    const resultado = await provedor(fetchMock).issueNFe(command);
    expect(resultado.status).toBe('AUTHORIZED');
    expect(resultado.accessKey).toBe(evento.accessKey);
    expect(resultado.protocol).toBe(evento.protocol);
    expect(resultado.jobId).toBe('job-1');
    expect(urlsChamadas(fetchMock).at(-1)).toContain('/fiscal/nfe/job/job-1');
  });

  it('job que termina em erro vira recusa com o motivo da SEFAZ', async () => {
    const fetchMock = jest
      .fn()
      .mockResolvedValueOnce(resposta(202, { sucesso: true, dados: { jobId: 'job-2' } }))
      .mockResolvedValueOnce(
        resposta(200, {
          sucesso: true,
          dados: {
            status: 'erro',
            resultado: { status: 'rejeitada', motivo: 'Rejeição: IE do emitente inválida' },
            codigoRejeicao: '209',
          },
        }),
      );

    const resultado = await provedor(fetchMock).issueNFe(command);
    expect(resultado.status).toBe('REJECTED');
    expect(resultado.message).toBe('Rejeição: IE do emitente inválida');
    expect(resultado.code).toBe('209');
  });

  it('cancelamento usa chaveAcesso, como a API do Gyn espera', async () => {
    const fetchMock = jest
      .fn()
      .mockResolvedValueOnce(resposta(202, { sucesso: true, dados: { jobId: 'job-3' } }))
      .mockResolvedValueOnce(
        resposta(200, {
          sucesso: true,
          dados: { status: 'concluido', resultado: { status: 'cancelada' } },
        }),
      );

    const resultado = await provedor(fetchMock).cancelDocument(evento);
    expect(resultado.status).toBe('CANCELLED');
    expect(corpoEnviado(fetchMock, 0)).toEqual({
      chaveAcesso: evento.accessKey,
      protocolo: evento.protocol,
      justificativa: evento.justification,
    });
  });

  it('confirma que a chave da API é de homologação', async () => {
    const fetchMock = jest.fn().mockResolvedValue(resposta(200, { sucesso: true, dados: [] }));
    await provedor(fetchMock).assertHomologationEnvironment();
    expect(urlsChamadas(fetchMock)[0]).toContain('/fiscal/nfe/listar?ambiente=homologacao');
  });
});
