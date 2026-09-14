import { BoletoRepository } from '../../finance/repositories/boleto.repository';
import { Injectable, Logger } from '@nestjs/common';
import type {
  FiscalCompanyConfig,
  FiscalProvider,
  IntegrationServiceId,
  IntegrationStatus,
} from '@synapse/types';
import { buildHomologationNfePayload } from '../../fiscal/services/homologation-nfe.payload';
import { randomUUID } from 'node:crypto';
import { BankProviderRegistry } from '../../finance/services/bank-provider.registry';
import { FiscalConfigService } from '../../fiscal/services/fiscal-config.service';
import { FiscalProviderRegistry } from '../../fiscal/services/fiscal-provider.registry';
import { NfeService } from '../../fiscal/services/nfe.service';
import { PlatformRepository } from '../repositories/platform.repository';

const LABEL: Record<IntegrationServiceId, string> = {
  SEFAZ_NFE: 'SEFAZ · NF-e',
  SEFAZ_NFCE: 'SEFAZ · NFC-e',
  MDFE: 'MDF-e',
  SICREDI: 'Sicredi',
  ITAU: 'Itaú',
};

const FISCAL_SERVICES: readonly IntegrationServiceId[] = ['SEFAZ_NFE', 'SEFAZ_NFCE', 'MDFE'];
const BANK_SERVICES: readonly IntegrationServiceId[] = ['SICREDI', 'ITAU'];

interface FiscalConnectionIdentity {
  readonly cpfCnpj: string;
  readonly environment: 'homologation' | 'production';
}

type TestableFiscalProvider = FiscalProvider & {
  testConnection?: (identity: FiscalConnectionIdentity) => Promise<void>;
  assertHomologationEnvironment?: (identity: FiscalConnectionIdentity) => Promise<void>;
};

/** A identificação fiscal é cadastrada uma única vez, na etapa Parâmetros da Empresa. */
const fiscalIdentity = (config: FiscalCompanyConfig | undefined): FiscalConnectionIdentity => {
  const cpfCnpj = config?.issuer?.document?.replace(/\D/g, '') ?? '';
  if (cpfCnpj.length !== 11 && cpfCnpj.length !== 14) {
    throw new Error(
      'Informe o CPF/CNPJ do emitente nos Parâmetros da Empresa do Assistente de Configuração de NF-e.',
    );
  }
  return {
    cpfCnpj,
    environment: config?.environment === 'PRODUCAO' ? 'production' : 'homologation',
  };
};

const fiscalCredentialsConfigured = (config: FiscalCompanyConfig | undefined): boolean => {
  if (!config) return false;
  return config.provider === 'GYN_FISCAL'
    ? Boolean(config.providerApiKeySecretRef && config.providerTenantIdSecretRef)
    : Boolean(config.certificateSecretRef);
};

@Injectable()
export class IntegrationsService {
  private readonly logger = new Logger(IntegrationsService.name);
  constructor(
    private readonly fiscalConfig: FiscalConfigService,
    private readonly fiscalProviders: FiscalProviderRegistry,
    private readonly nfe: NfeService,
    private readonly bankProviders: BankProviderRegistry,
    private readonly repository: PlatformRepository,
    private readonly accounts: BoletoRepository,
  ) {}

  async list(tenantId: string): Promise<IntegrationStatus[]> {
    const status = await this.repository.getStatus(tenantId);
    const config = await this.fiscalConfig.get(tenantId);
    const accounts = await this.accounts.accounts(tenantId);
    const testDetails = (service: IntegrationServiceId) => {
      const lastTest = status.integrationTests[service]?.lastTest ?? null;
      const lastHomologationTest =
        status.integrationHomologationTests[service]?.lastHomologationTest ?? null;
      return {
        lastTest,
        lastHomologationTest,
        lastCommunicationAt:
          [lastTest?.occurredAt, lastHomologationTest?.occurredAt]
            .filter((at): at is string => Boolean(at))
            .sort()
            .at(-1) ?? null,
      };
    };

    const fiscal = FISCAL_SERVICES.map((service): IntegrationStatus => ({
      service,
      label: LABEL[service],
      environment: config?.environment ?? 'NÃO CONFIGURADO',
      credentialsConfigured: fiscalCredentialsConfigured(config),
      ...testDetails(service),
    }));
    const banks = BANK_SERVICES.map((service): IntegrationStatus => {
      const account = accounts.find((candidate) => candidate.bankId === service && candidate.ativo);
      return {
        service,
        label: LABEL[service],
        environment: account?.environment ?? 'NÃO CONFIGURADO',
        credentialsConfigured: Boolean(
          account && account.environment !== 'MOCK' && (account.sicredi || account.itau),
        ),
        ...testDetails(service),
      };
    });
    return [...fiscal, ...banks];
  }

  async testConnection(tenantId: string, service: IntegrationServiceId) {
    const result = await this.runTest(tenantId, service, false);
    await this.repository.recordTest(tenantId, service, result);
    return result;
  }

  async runHomologationTest(tenantId: string, service: IntegrationServiceId) {
    const result = await this.runTest(tenantId, service, true);
    await this.repository.recordHomologationTest(tenantId, service, result);
    return result;
  }

  private async runTest(tenantId: string, service: IntegrationServiceId, thorough: boolean) {
    const now = () => new Date().toISOString();
    try {
      if (FISCAL_SERVICES.includes(service)) {
        await this.testFiscal(tenantId, service, thorough);
      } else {
        await this.testBank(tenantId, service as 'SICREDI' | 'ITAU', thorough);
      }
      const simulated = FISCAL_SERVICES.includes(service)
        ? (await this.fiscalConfig.get(tenantId))?.provider === 'MOCK'
        : (await this.accounts.accounts(tenantId)).find((a) => a.bankId === service && a.ativo)
            ?.environment === 'MOCK';
      return {
        success: true,
        qualifiesForProduction: !simulated,
        message: simulated
          ? 'Simulação MOCK concluída; não comprova homologação bancária/fiscal.'
          : thorough
            ? 'Teste de homologação concluído: emitiu e cancelou um documento/boleto de teste.'
            : 'Conexão respondeu normalmente.',
        occurredAt: now(),
      };
    } catch (error) {
      const message = (error as Error).message;
      // O card mostra so a ultima mensagem; o terminal da API guarda o historico.
      this.logger.warn(
        JSON.stringify({
          event: 'integration_test_failed',
          tenantId,
          service,
          kind: thorough ? 'homologation' : 'connection',
          message,
        }),
      );
      return { success: false, message, occurredAt: now() };
    }
  }

  private async testFiscal(
    tenantId: string,
    service: (typeof FISCAL_SERVICES)[number],
    thorough: boolean,
  ): Promise<void> {
    const config = await this.fiscalConfig.get(tenantId);
    if (!config) throw new Error('Configuração fiscal ainda não foi salva para este tenant');
    if (thorough && config.environment === 'PRODUCAO')
      throw new Error('Teste de homologação não pode emitir documentos em produção');
    const provider = await this.fiscalProviders.resolve(config);
    const identity = fiscalIdentity(config);

    if (!thorough) {
      const capable = provider as TestableFiscalProvider;
      if (capable.testConnection) {
        await capable.testConnection(identity);
      } else {
        await provider.queryDFe({
          cpf_cnpj: identity.cpfCnpj,
          ambiente: identity.environment,
          tipo_consulta: 'dist-nsu',
          dist_nsu: 0,
          uf_autor: config.state,
        });
      }
      return;
    }
    if (service === 'SEFAZ_NFE') {
      await this.assertHomologationKey(provider, identity);
      const document = await this.nfe.issue(tenantId, {
        companyId: tenantId,
        referenceId: `homologacao-${randomUUID()}`,
        idempotencyKey: `homolog-${randomUUID()}`,
        // NF-e de verdade, montada com os dados do assistente: a de antes era um
        // `{ homologacao: true }` que o provedor recusava na validação.
        payload: buildHomologationNfePayload(config),
      });
      // Sem isso a recusa virava "NF-e ainda não autorizada" no cancelamento.
      if (document.status !== 'AUTHORIZED') {
        throw new Error(
          document.sefazMessage ??
            `A NF-e de teste ficou ${document.status} no provedor e não foi autorizada.`,
        );
      }
      await this.nfe.cancel(tenantId, document.id, {
        justification: 'Cancelamento automático do teste de homologação da Central de Integrações',
        idempotencyKey: `homolog-cancel-${randomUUID()}`,
      });
      return;
    }
    // NFC-e e MDF-e ainda não têm um service de aplicação (só o provider) —
    // o teste de homologação delas fica no nível do provider mesmo, sem
    // passar por um FiscalDocument persistido.
    const issued = await (service === 'SEFAZ_NFCE' ? provider.issueNFCe : provider.issueMDFe)({
      companyId: tenantId,
      referenceId: `homologacao-${randomUUID()}`,
      number: 1,
      series: 1,
      payload: { homologacao: true },
      idempotencyKey: `homolog-${randomUUID()}`,
    });
    if (!issued.accessKey || !issued.protocol) {
      throw new Error('Provider não devolveu chave/protocolo no teste de homologação');
    }
    await provider.cancelDocument({
      companyId: tenantId,
      accessKey: issued.accessKey,
      protocol: issued.protocol,
      justification: 'Cancelamento automático do teste de homologação da Central de Integrações',
      idempotencyKey: `homolog-cancel-${randomUUID()}`,
    });
  }

  /** A nota de teste nunca sai com chave de produção: o provedor confirma antes
   *  que a chave da API é de homologação. */
  private async assertHomologationKey(
    provider: FiscalProvider,
    identity: FiscalConnectionIdentity,
  ): Promise<void> {
    await (provider as TestableFiscalProvider).assertHomologationEnvironment?.(identity);
  }

  private async testBank(
    tenantId: string,
    bankId: 'SICREDI' | 'ITAU',
    thorough: boolean,
  ): Promise<void> {
    const account = (await this.accounts.accounts(tenantId)).find(
      (a) => a.bankId === bankId && a.ativo,
    );
    if (!account) throw new Error('Cadastre uma conta bancária antes de testar');
    if (thorough && account.environment === 'PRODUCAO')
      throw new Error('Teste de homologação não pode emitir boletos em produção');
    const provider = this.bankProviders.resolve(account);

    if (!thorough) {
      const today = new Date().toISOString().slice(0, 10);
      await provider.getTransactions({ de: today, ate: today });
      return;
    }
    const referencia = `homologacao-${randomUUID()}`;
    const boleto = await provider.createBoleto({
      referencia,
      valorCentavos: 100,
      vencimento: new Date(Date.now() + 7 * 86_400_000).toISOString().slice(0, 10),
      pagador: { nome: 'Teste de Homologação', documento: '00000000000' },
    });
    await provider.cancelBoleto(boleto.nossoNumero);
  }
}
