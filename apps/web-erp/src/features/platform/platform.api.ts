import { apiRequest } from '../../lib/dev-auth';

export { devSignIn, isSignedIn } from '../../lib/dev-auth';

export type IntegrationServiceId = 'SEFAZ_NFE' | 'SEFAZ_NFCE' | 'MDFE' | 'SICREDI' | 'ITAU';

export interface IntegrationTestResult {
  readonly success: boolean;
  readonly message: string;
  readonly occurredAt: string;
}

export interface IntegrationStatus {
  readonly service: IntegrationServiceId;
  readonly label: string;
  readonly environment: string;
  readonly credentialsConfigured: boolean;
  readonly lastTest: IntegrationTestResult | null;
  readonly lastHomologationTest: IntegrationTestResult | null;
  readonly lastCommunicationAt: string | null;
}

export const listIntegrations = (): Promise<IntegrationStatus[]> =>
  apiRequest('/platform/integrations');

export const testIntegrationConnection = (
  service: IntegrationServiceId,
): Promise<IntegrationTestResult> =>
  apiRequest(`/platform/integrations/${service}/test`, { method: 'POST' });

export const runHomologationTest = (
  service: IntegrationServiceId,
): Promise<IntegrationTestResult> =>
  apiRequest(`/platform/integrations/${service}/homologation-test`, { method: 'POST' });

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

export interface OnboardingStep {
  readonly id: OnboardingStepId;
  readonly label: string;
  readonly completed: boolean;
  readonly required: boolean;
  readonly detail: string;
}

export interface OnboardingStatus {
  readonly steps: readonly OnboardingStep[];
  readonly readyForProduction: boolean;
  readonly productionActivatedAt: string | null;
  readonly productionActivatedBy: string | null;
}

export const getOnboardingStatus = (): Promise<OnboardingStatus> =>
  apiRequest('/platform/onboarding');

export const activateProduction = (confirmation: string): Promise<OnboardingStatus> =>
  apiRequest('/platform/onboarding/activate-production', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ confirmation }),
  });
