import type { UserId } from '../common';

export type IntegrationServiceId = 'SEFAZ_NFE' | 'SEFAZ_NFCE' | 'MDFE' | 'SICREDI' | 'ITAU';

export interface IntegrationTestResult {
  readonly success: boolean;
  readonly message: string;
  readonly occurredAt: string;
}

/** §64: um card por serviço, com ambiente, status, último teste, credenciais
 *  e última comunicação. */
export interface IntegrationStatus {
  readonly service: IntegrationServiceId;
  readonly label: string;
  readonly environment: string;
  readonly credentialsConfigured: boolean;
  readonly lastTest: IntegrationTestResult | null;
  readonly lastHomologationTest: IntegrationTestResult | null;
  readonly lastCommunicationAt: string | null;
}

export type OnboardingStepId =
  | 'DADOS_EMPRESA'
  | 'FILIAIS'
  | 'CERTIFICADO_FISCAL'
  | 'CONFIG_FISCAL'
  | 'BANCO'
  | 'ESTOQUE'
  | 'PRODUTOS'
  | 'USUARIOS'
  | 'TESTE_HOMOLOGACAO'
  | 'PRODUCAO';

/** §65: as dez etapas do assistente de ativação, na ordem em que aparecem. */
export interface OnboardingStep {
  readonly id: OnboardingStepId;
  readonly label: string;
  readonly completed: boolean;
  /** PRODUCAO não é "obrigatória" no sentido de bloquear a si mesma — é o
   *  resultado, não um pré-requisito dela mesma. As outras nove são. */
  readonly required: boolean;
  readonly detail: string;
}

export interface OnboardingStatus {
  readonly steps: readonly OnboardingStep[];
  readonly readyForProduction: boolean;
  readonly productionActivatedAt: string | null;
  readonly productionActivatedBy: UserId | null;
}
