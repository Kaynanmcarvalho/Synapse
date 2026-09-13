import type { BoletoRepository } from '../../finance/repositories/boleto.repository';
import type { BankProvider, FiscalCompanyConfig, FiscalProvider } from '@synapse/types';
import type { BankProviderRegistry } from '../../finance/services/bank-provider.registry';
import type { FiscalConfigService } from '../../fiscal/services/fiscal-config.service';
import type { FiscalProviderRegistry } from '../../fiscal/services/fiscal-provider.registry';
import type { NfeService } from '../../fiscal/services/nfe.service';
import type { PlatformRepository } from '../repositories/platform.repository';
import { IntegrationsService } from './integrations.service';

const tenantId = 'tenant-1';

function buildService(
  options: {
    fiscalConfig?: FiscalCompanyConfig;
    fiscalProvider?: Partial<FiscalProvider>;
    bankProvider?: Partial<BankProvider>;
  } = {},
) {
  const fiscalConfig = { get: jest.fn(() => options.fiscalConfig) };
  const fiscalProvider = {
    queryDFe: jest.fn(() => Promise.resolve([])),
    issueNFCe: jest.fn(),
    issueMDFe: jest.fn(),
    cancelDocument: jest.fn(),
    ...options.fiscalProvider,
  };
  const fiscalProviders = { resolve: jest.fn(() => fiscalProvider) };
  const nfe = { issue: jest.fn(), cancel: jest.fn() };
  const bankProvider = {
    getTransactions: jest.fn(() => Promise.resolve([])),
    createBoleto: jest.fn(),
    cancelBoleto: jest.fn(),
    ...options.bankProvider,
  };
  const bankProviders = { resolve: jest.fn(() => bankProvider) };
  const recordTest = jest.fn(() => Promise.resolve());
  const recordHomologationTest = jest.fn(() => Promise.resolve());
  const repository = {
    getStatus: jest.fn(() =>
      Promise.resolve({
        integrationTests: {},
        integrationHomologationTests: {},
        homologationPassed: false,
        productionActivatedAt: null,
        productionActivatedBy: null,
      }),
    ),
    recordTest,
    recordHomologationTest,
  };

  const service = new IntegrationsService(
    fiscalConfig as unknown as FiscalConfigService,
    fiscalProviders as unknown as FiscalProviderRegistry,
    nfe as unknown as NfeService,
    bankProviders as unknown as BankProviderRegistry,
    repository as unknown as PlatformRepository,
    {
      accounts: jest.fn(async () => [
        { id: 'mock', bankId: 'SICREDI', environment: 'MOCK', ativo: true },
        { id: 'mock2', bankId: 'ITAU', environment: 'MOCK', ativo: true },
      ]),
    } as unknown as BoletoRepository,
  );
  return { service, fiscalConfig, fiscalProvider, fiscalProviders, nfe, bankProvider, repository };
}

const fiscalConfigFixture = (extra: Partial<FiscalCompanyConfig> = {}): FiscalCompanyConfig =>
  ({
    companyId: tenantId,
    environment: 'HOMOLOGACAO',
    provider: 'MOCK',
    certificateSecretRef: 'ref',
    // O teste de homologação monta uma NF-e de verdade com estes dados.
    crt: 3,
    state: 'GO',
    stateRegistration: '108052079',
    issuer: {
      personType: 'PJ',
      document: '38242542000143',
      legalName: 'RP DISTRIBUIDORA LTDA',
      tradeName: 'REDE PET',
      address: {
        zipCode: '74946630',
        street: 'RUA DAS MATAS',
        number: 'S/N',
        complement: '',
        district: 'RESIDENCIAL NORTE SUL',
        cityCode: '5201405',
        cityName: 'APARECIDA DE GOIANIA',
        countryCode: '1058',
      },
    },
    ...extra,
  }) as FiscalCompanyConfig;

describe('IntegrationsService.list', () => {
  it('lista os 5 serviços, marcando os fiscais como configurados quando há certificado', async () => {
    const { service } = buildService({ fiscalConfig: fiscalConfigFixture() });
    const items = await service.list(tenantId);
    expect(items.map((item) => item.service).sort()).toEqual(
      ['ITAU', 'MDFE', 'SEFAZ_NFCE', 'SEFAZ_NFE', 'SICREDI'].sort(),
    );
    expect(items.find((item) => item.service === 'SEFAZ_NFE')?.credentialsConfigured).toBe(true);
    expect(items.find((item) => item.service === 'SICREDI')?.credentialsConfigured).toBe(false);
  });

  it('mostra "NÃO CONFIGURADO" quando não há configuração fiscal salva', async () => {
    const { service } = buildService();
    const items = await service.list(tenantId);
    expect(items.find((item) => item.service === 'SEFAZ_NFE')?.environment).toBe('NÃO CONFIGURADO');
  });
});

describe('IntegrationsService.testConnection', () => {
  it('sucesso quando a configuração fiscal existe e o provider responde', async () => {
    const { service, repository } = buildService({ fiscalConfig: fiscalConfigFixture() });
    const result = await service.testConnection(tenantId, 'SEFAZ_NFE');
    expect(result.success).toBe(true);
    expect(repository.recordTest).toHaveBeenCalledWith(tenantId, 'SEFAZ_NFE', result);
  });

  it('falha com mensagem clara quando não há configuração fiscal', async () => {
    const { service } = buildService();
    const result = await service.testConnection(tenantId, 'SEFAZ_NFE');
    expect(result.success).toBe(false);
    expect(result.message).toMatch(/configuração fiscal/i);
  });

  it('testa banco contra a conta MOCK sintética, mesmo sem configuração persistida', async () => {
    const { service, bankProvider } = buildService();
    const result = await service.testConnection(tenantId, 'SICREDI');
    expect(result.success).toBe(true);
    expect(bankProvider.getTransactions).toHaveBeenCalled();
  });
});

describe('IntegrationsService.runHomologationTest', () => {
  it('SEFAZ_NFE emite e cancela via NfeService', async () => {
    const { service, nfe, repository } = buildService({ fiscalConfig: fiscalConfigFixture() });
    nfe.issue.mockResolvedValue({ id: 'doc-1', status: 'AUTHORIZED' });
    nfe.cancel.mockResolvedValue({ id: 'doc-1', status: 'CANCELLED' });

    const result = await service.runHomologationTest(tenantId, 'SEFAZ_NFE');
    expect(result.success).toBe(true);
    const payload = (nfe.issue.mock.calls[0]?.[1] as { payload: Record<string, unknown> }).payload;
    expect((payload.emitente as { cnpj: string }).cnpj).toBe('38242542000143');
    expect(payload.itens).toHaveLength(1);
    expect(nfe.cancel).toHaveBeenCalledWith('doc-1', expect.any(Object));
    expect(repository.recordHomologationTest).toHaveBeenCalledWith(tenantId, 'SEFAZ_NFE', result);
  });

  it('SEFAZ_NFE recusada mostra o motivo do provedor e não tenta cancelar', async () => {
    const { service, nfe } = buildService({ fiscalConfig: fiscalConfigFixture() });
    nfe.issue.mockResolvedValue({
      id: 'doc-2',
      status: 'REJECTED',
      sefazMessage:
        'Não foi possível autorizar a NF-e: Gyn Fiscal respondeu HTTP 400 (VALIDATION_ERROR): Dados inválidos.',
    });

    const result = await service.runHomologationTest(tenantId, 'SEFAZ_NFE');
    expect(result.success).toBe(false);
    expect(result.message).toContain('VALIDATION_ERROR');
    expect(nfe.cancel).not.toHaveBeenCalled();
  });

  it('sem os Parâmetros da Empresa, avisa o que falta em vez de emitir', async () => {
    const { service, nfe } = buildService({ fiscalConfig: fiscalConfigFixture({ issuer: null }) });

    const result = await service.runHomologationTest(tenantId, 'SEFAZ_NFE');
    expect(result.success).toBe(false);
    expect(result.message).toContain('Assistente de Configuração de NF-e');
    expect(nfe.issue).not.toHaveBeenCalled();
  });

  it('confirma no provedor que a chave da API é de homologação antes de emitir', async () => {
    const assertHomologationEnvironment = jest.fn(() => Promise.resolve());
    const { service, nfe } = buildService({
      fiscalConfig: fiscalConfigFixture(),
      fiscalProvider: { assertHomologationEnvironment } as unknown as Partial<FiscalProvider>,
    });
    nfe.issue.mockResolvedValue({ id: 'doc-3', status: 'AUTHORIZED' });
    nfe.cancel.mockResolvedValue({ id: 'doc-3', status: 'CANCELLED' });

    await service.runHomologationTest(tenantId, 'SEFAZ_NFE');
    expect(assertHomologationEnvironment).toHaveBeenCalled();
  });

  it('SEFAZ_NFCE emite e cancela via o provider diretamente', async () => {
    const { service, fiscalProvider } = buildService({ fiscalConfig: fiscalConfigFixture() });
    (fiscalProvider.issueNFCe as jest.Mock).mockResolvedValue({
      accessKey: 'chave-teste',
      protocol: 'protocolo-teste',
    });

    const result = await service.runHomologationTest(tenantId, 'SEFAZ_NFCE');
    expect(result.success).toBe(true);
    expect(fiscalProvider.cancelDocument).toHaveBeenCalledWith(
      expect.objectContaining({ accessKey: 'chave-teste', protocol: 'protocolo-teste' }),
    );
  });

  it('reporta falha quando o provider não devolve chave/protocolo', async () => {
    const { service, fiscalProvider } = buildService({ fiscalConfig: fiscalConfigFixture() });
    (fiscalProvider.issueNFCe as jest.Mock).mockResolvedValue({ accessKey: null, protocol: null });

    const result = await service.runHomologationTest(tenantId, 'SEFAZ_NFCE');
    expect(result.success).toBe(false);
  });

  it('banco cria e cancela um boleto de teste', async () => {
    const { service, bankProvider } = buildService();
    (bankProvider.createBoleto as jest.Mock).mockResolvedValue({ nossoNumero: '123' });

    const result = await service.runHomologationTest(tenantId, 'ITAU');
    expect(result.success).toBe(true);
    expect(bankProvider.cancelBoleto).toHaveBeenCalledWith('123');
  });
});
