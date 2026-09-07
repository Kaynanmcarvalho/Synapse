import { BoletoRepository } from '../../finance/repositories/boleto.repository';
import { BadRequestException, ForbiddenException, Injectable } from '@nestjs/common';
import type { OnboardingStatus, OnboardingStep, OnboardingStepId } from '@synapse/types';
import { StockIntelligenceService } from '../../analytics/services/stock-intelligence.service';
import { ProductService } from '../../catalog/services/product.service';
import { FiscalConfigService } from '../../fiscal/services/fiscal-config.service';
import { BranchService } from '../../iam/services/branch.service';
import type { TenantContext } from '../../iam/iam.types';
import { MembershipRepository } from '../../iam/repositories/membership.repository';
import { PlatformRepository } from '../repositories/platform.repository';

const REQUIRED_CONFIRMATION = 'ATIVAR PRODUCAO';

/** §65: as dez etapas do assistente, na ordem em que a tela mostra. As nove
 *  primeiras são pré-requisito da décima — "produção" nunca é obrigatória
 *  de si mesma, ela é o destino. */
@Injectable()
export class PlatformOnboardingService {
  constructor(
    private readonly branches: BranchService,
    private readonly fiscalConfig: FiscalConfigService,
    private readonly stockIntelligence: StockIntelligenceService,
    private readonly products: ProductService,
    private readonly memberships: MembershipRepository,
    private readonly repository: PlatformRepository,
    private readonly accounts: BoletoRepository,
  ) {}

  async getStatus(context: TenantContext): Promise<OnboardingStatus> {
    const platformStatus = await this.repository.getStatus(context.tenantId);
    const config = this.fiscalConfig.get(context.tenantId);
    const branches = this.branches.list(context);
    const hasStock = await this.stockIntelligence.hasAnyStock(context.tenantId);
    const productPage = this.products.search(context, {}, 1);
    const members = await this.memberships.listByTenant(context.tenantId);

    const steps = this.buildSteps({
      branchCount: branches.length,
      config,
      hasStock,
      hasProducts: productPage.items.length > 0,
      memberCount: members.length,
      homologationPassed: platformStatus.homologationPassed,
      productionActivatedAt: platformStatus.productionActivatedAt,
    });
    const accounts = await this.accounts.accounts(context.tenantId);
    const bankReady = accounts.some(
      (a) =>
        a.ativo &&
        a.environment !== 'MOCK' &&
        Boolean(a.sicredi || a.itau) &&
        platformStatus.integrationHomologationTests[a.bankId as 'SICREDI' | 'ITAU']
          ?.lastHomologationTest?.qualifiesForProduction === true,
    );
    const bankIndex = steps.findIndex((step) => step.id === 'BANCO');
    steps[bankIndex] = this.step(
      'BANCO',
      'Conta bancária',
      bankReady,
      true,
      bankReady
        ? 'Conta cadastrada e homologada'
        : 'Cadastre e homologue uma conta real; MOCK não libera produção',
    );
    const readyForProduction = steps
      .filter((step) => step.required)
      .every((step) => step.completed);

    return {
      steps,
      readyForProduction,
      productionActivatedAt: platformStatus.productionActivatedAt,
      productionActivatedBy:
        platformStatus.productionActivatedBy as OnboardingStatus['productionActivatedBy'],
    };
  }

  private buildSteps(input: {
    branchCount: number;
    config: ReturnType<FiscalConfigService['get']>;
    hasStock: boolean;
    hasProducts: boolean;
    memberCount: number;
    homologationPassed: boolean;
    productionActivatedAt: string | null;
  }): OnboardingStep[] {
    return [
      ...this.buildSetupSteps(input.branchCount, input.config),
      ...this.buildOperationalSteps(input),
    ];
  }

  private buildSetupSteps(
    branchCount: number,
    config: ReturnType<FiscalConfigService['get']>,
  ): OnboardingStep[] {
    return [
      this.step('DADOS_EMPRESA', 'Dados da empresa', true, true, 'Empresa criada no cadastro'),
      this.step(
        'FILIAIS',
        'Filiais',
        branchCount > 0,
        true,
        branchCount > 0 ? `${branchCount} filial(is) cadastrada(s)` : 'Nenhuma filial ainda',
      ),
      this.step(
        'CERTIFICADO_FISCAL',
        'Certificado fiscal',
        Boolean(config?.certificateSecretRef),
        true,
        config?.certificateSecretRef
          ? 'Certificado A1 configurado'
          : 'Certificado ainda não enviado',
      ),
      this.step(
        'CONFIG_FISCAL',
        'Configuração fiscal',
        config !== undefined,
        true,
        config ? `Ambiente ${config.environment}` : 'Configuração fiscal ainda não salva',
      ),
      this.step(
        'BANCO',
        'Conta bancária',
        false,
        true,
        'Nenhuma conta bancária cadastrada ainda (Sicredi/Itaú rodam em modo mock)',
      ),
    ];
  }

  private buildOperationalSteps(input: {
    hasStock: boolean;
    hasProducts: boolean;
    memberCount: number;
    homologationPassed: boolean;
    productionActivatedAt: string | null;
  }): OnboardingStep[] {
    const { hasStock, hasProducts, memberCount, homologationPassed, productionActivatedAt } = input;
    return [
      this.step(
        'ESTOQUE',
        'Estoque',
        hasStock,
        true,
        hasStock ? 'Já existe saldo lançado' : 'Nenhum lançamento de estoque ainda',
      ),
      this.step(
        'PRODUTOS',
        'Produtos',
        hasProducts,
        true,
        hasProducts ? 'Catálogo com produtos cadastrados' : 'Nenhum produto cadastrado',
      ),
      this.step(
        'USUARIOS',
        'Usuários',
        memberCount > 1,
        true,
        `${memberCount} usuário(s) no tenant`,
      ),
      this.step(
        'TESTE_HOMOLOGACAO',
        'Teste de homologação',
        homologationPassed,
        true,
        homologationPassed
          ? 'Ao menos um teste de homologação passou'
          : 'Nenhum teste de homologação passou ainda',
      ),
      this.step(
        'PRODUCAO',
        'Produção',
        productionActivatedAt !== null,
        false,
        productionActivatedAt
          ? `Ativada em ${productionActivatedAt}`
          : 'Produção ainda não ativada',
      ),
    ];
  }

  /** §65 "não liberar produção enquanto houver etapa obrigatória
   *  incompleta" + confirmação adicional (mesma frase que o próprio
   *  `FiscalConfigService.save` já exige pra mudar pra produção — um só
   *  padrão de confirmação sensível no sistema, não dois). */
  async activateProduction(
    context: TenantContext,
    confirmation: string,
  ): Promise<OnboardingStatus> {
    if (confirmation !== REQUIRED_CONFIRMATION) {
      throw new BadRequestException(`Confirme digitando exatamente "${REQUIRED_CONFIRMATION}"`);
    }
    const status = await this.getStatus(context);
    if (status.productionActivatedAt) {
      throw new ForbiddenException('Produção já foi ativada para este tenant');
    }
    if (!status.readyForProduction) {
      const pending = status.steps.filter((step) => step.required && !step.completed);
      throw new BadRequestException(
        `Etapas obrigatórias pendentes: ${pending.map((step) => step.label).join(', ')}`,
      );
    }
    await this.repository.activateProduction(
      context.tenantId,
      context.userId,
      new Date().toISOString(),
    );
    return this.getStatus(context);
  }

  private step(
    id: OnboardingStepId,
    label: string,
    completed: boolean,
    required: boolean,
    detail: string,
  ): OnboardingStep {
    return { id, label, completed, required, detail };
  }
}
