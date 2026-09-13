import type {
  FiscalEmailSettings,
  FiscalEmissionSettings,
  FiscalEnvironment,
  FiscalIssuer,
  NfceSettings,
  NfeSettings,
  PisCofinsDefaults,
} from '@synapse/types';
import { rotuloDoCrt } from './assistente.dados';
import { serieNfcePadrao } from './assistente.padrao';
import type { FormularioFiscal, SegredosDigitados } from './assistente.tipos';

/** Corpo do PUT /fiscal/config (fiscalConfigSchema na API). */
export interface ConfigFiscalPayload {
  readonly companyId: string;
  readonly environment: FiscalEnvironment;
  readonly provider: 'MOCK' | 'GYN_FISCAL';
  readonly crt: 1 | 2 | 3 | 4;
  readonly stateRegistration: string;
  readonly cscId: string | null;
  readonly nfeSeries: number;
  readonly nfceSeries: number;
  readonly nfceContingencyEnabled: boolean;
  readonly nfceCancellationWindowMinutes: number;
  readonly state: string;
  readonly taxRegime: string;
  readonly issuer: FiscalIssuer;
  readonly emission: FiscalEmissionSettings;
  readonly email: FiscalEmailSettings;
  readonly pisCofins: PisCofinsDefaults;
  readonly nfe: NfeSettings;
  readonly nfce: NfceSettings;
  readonly productionConfirmation?: 'ATIVAR PRODUCAO';
  readonly certificateBase64?: string;
  readonly certificatePassword?: string;
  readonly csc?: string;
  readonly providerApiKey?: string;
  readonly providerTenantId?: string;
  readonly smtpPassword?: string;
  readonly nfceOfflinePassword?: string;
}

const SEGREDOS = [
  'certificateBase64',
  'certificatePassword',
  'csc',
  'providerApiKey',
  'providerTenantId',
  'smtpPassword',
  'nfceOfflinePassword',
] as const;

/** Segredo so viaja quando foi digitado agora; vazio mantem o que esta no cofre.
 *  A confirmacao de producao ja foi pedida ao trocar o ambiente na tela. */
export const paraPayload = (
  companyId: string,
  formulario: FormularioFiscal,
  segredos: SegredosDigitados,
): ConfigFiscalPayload => {
  const digitados = Object.fromEntries(
    SEGREDOS.filter((chave) => segredos[chave] !== '').map((chave) => [chave, segredos[chave]]),
  );
  return {
    companyId,
    environment: formulario.environment,
    provider: formulario.provider,
    crt: formulario.crt,
    stateRegistration: formulario.stateRegistration.trim().toUpperCase(),
    cscId: formulario.cscId.trim() || null,
    nfeSeries: formulario.nfeSeries,
    nfceSeries: serieNfcePadrao(formulario),
    nfceContingencyEnabled: formulario.nfceContingencyEnabled,
    nfceCancellationWindowMinutes: formulario.nfceCancellationWindowMinutes,
    state: formulario.state,
    taxRegime: rotuloDoCrt(formulario.crt),
    issuer: formulario.issuer,
    emission: formulario.emission,
    email: formulario.email,
    pisCofins: formulario.pisCofins,
    nfe: formulario.nfe,
    nfce: formulario.nfce,
    ...(formulario.environment === 'PRODUCAO'
      ? { productionConfirmation: 'ATIVAR PRODUCAO' as const }
      : {}),
    ...digitados,
  };
};
