import { Injectable } from '@nestjs/common';
import type { BankAccountConfig, IntegrationServiceId, IntegrationStatus } from '@synapse/types';
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

/** Uma conta MOCK sintética, nunca persistida: o financeiro (Renier, em
 *  paralelo) ainda não tem um repositório de `BankAccountConfig` — sem
 *  isso, não há credencial real de Sicredi/Itaú pra testar. O teste de
 *  conexão aqui prova que o encanamento (registry -> provider) funciona no
 *  ambiente de desenvolvimento; vira teste de verdade assim que a conta
 *  bancária ganhar persistência própria. */
const mockBankConfig = (bankId: 'SICREDI' | 'ITAU'): BankAccountConfig => ({
  id: 'mock',
  bankId,
  environment: 'MOCK',
  apelido: `${bankId} (mock)`,
  ativo: true,
  baseUrl: null,
});

/** §64: um card por serviço fiscal/bancário, com teste de conexão leve e um
 *  teste de homologação mais completo (emite e cancela um documento/boleto
 *  de teste de verdade). "companyId" é tratado como o próprio tenantId —
 *  simplificação para o caso comum de uma empresa por tenant; o cadastro de
 *  múltiplas empresas por tenant, se vier a existir, precisa revisitar isso. */
@Injectable()
export class IntegrationsService {
  constructor(
    private readonly fiscalConfig: FiscalConfigService,
    private readonly fiscalProviders: FiscalProviderRegistry,
    private readonly nfe: NfeService,
    private readonly bankProviders: BankProviderRegistry,
    private readonly repository: PlatformRepository,
  ) {}

  async list(tenantId: string): Promise<IntegrationStatus[]> {
    const status = await this.repository.getStatus(tenantId);
    const config = this.fiscalConfig.get(tenantId);

    return [...FISCAL_SERVICES, ...BANK_SERVICES].map((service) => {
      const isFiscal = FISCAL_SERVICES.includes(service);
      return {
        service,
        label: LABEL[service],
        environment: isFiscal ? (config?.environment ?? 'NÃO CONFIGURADO') : 'MOCK',
        credentialsConfigured: isFiscal ? Boolean(config?.certificateSecretRef) : false,
        lastTest: status.integrationTests[service]?.lastTest ?? null,
        lastHomologationTest:
          status.integrationHomologationTests[service]?.lastHomologationTest ?? null,
        lastCommunicationAt: status.integrationTests[service]?.lastTest?.occurredAt ?? null,
      };
    });
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
        await this.testBank(service as 'SICREDI' | 'ITAU', thorough);
      }
      return {
        success: true,
        message: thorough
          ? 'Teste de homologação concluído: emitiu e cancelou um documento/boleto de teste.'
          : 'Conexão respondeu normalmente.',
        occurredAt: now(),
      };
    } catch (error) {
      return { success: false, message: (error as Error).message, occurredAt: now() };
    }
  }

  private async testFiscal(
    tenantId: string,
    service: (typeof FISCAL_SERVICES)[number],
    thorough: boolean,
  ): Promise<void> {
    const config = this.fiscalConfig.get(tenantId);
    if (!config) throw new Error('Configuração fiscal ainda não foi salva para este tenant');
    const provider = this.fiscalProviders.resolve(config);

    if (!thorough) {
      await provider.queryDFe({});
      return;
    }
    if (service === 'SEFAZ_NFE') {
      const document = await this.nfe.issue(tenantId, {
        companyId: tenantId,
        referenceId: `homologacao-${randomUUID()}`,
        idempotencyKey: `homolog-${randomUUID()}`,
        payload: { homologacao: true },
      });
      await this.nfe.cancel(document.id, {
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

  private async testBank(bankId: 'SICREDI' | 'ITAU', thorough: boolean): Promise<void> {
    const provider = this.bankProviders.resolve(mockBankConfig(bankId));

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
