import type {
  FiscalCompanyConfig,
  FiscalEmissionSettings,
  FiscalIssuer,
  NfceSettings,
} from '@synapse/types';
import type { FormularioFiscal, SegredosDigitados, SegredosGravados } from './assistente.tipos';

/* Ponto de partida de uma empresa que nunca passou pelo assistente. As caixas
 * marcadas e as aliquotas de PIS/COFINS sao as que o Syndata traz de fabrica.
 * Os objetos sao readonly e o formulario sempre copia antes de mudar. */

const EMITENTE_PADRAO: FiscalIssuer = {
  personType: 'PJ',
  document: '',
  legalName: '',
  tradeName: '',
  municipalRegistration: '',
  suframaRegistration: '',
  address: {
    zipCode: '',
    street: '',
    number: '',
    complement: '',
    district: '',
    cityCode: '',
    cityName: '',
    countryCode: '1058',
  },
  phone: '',
  phone2: '',
  fax: '',
  email: '',
  responsible: '',
  cnae: '',
  accountantDocument: '',
  accountantName: '',
};

const EMISSAO_PADRAO: FiscalEmissionSettings = {
  reuseLastNote: false,
  showAuthorizationReceipt: false,
  receivablesInXml: true,
  billingInOrderNote: true,
  billingNoteContent: 'BOTH',
  sellerInNote: false,
  customerEmailInXml: false,
  allowGenericNumbering: false,
  accountantXmlAuthorization: false,
  freightInNote: true,
  orderNumberInNote: true,
  customerTradeNameInNote: false,
  removeAccents: false,
  xmlDownloadDocument: '',
  paymentBeneficiaryCnpj: '',
  autoSendEmail: false,
};

const NFCE_PADRAO: NfceSettings = {
  cfopInState: '5102',
  openEmissionScreen: false,
  seriesMode: 'TERMINAL',
  series: [],
  danfe: {
    style: 'MINI_PRINTER',
    detailed: false,
    productAdditionalInfo: true,
    approximateTaxes: true,
    a4Layout: 'STANDARD',
    unidentifiedConsumerName: false,
    cutPaper: false,
    orderPassword: false,
    registerNumber: false,
    additionalInfo: '',
  },
  emissionMode: 'NORMAL',
  requireOfflinePassword: false,
  acquirers: [],
};

export const formularioPadrao = (): FormularioFiscal => ({
  environment: 'HOMOLOGACAO',
  provider: 'GYN_FISCAL',
  crt: 3,
  stateRegistration: '',
  state: '',
  cscId: '',
  nfeSeries: 1,
  nfceSeries: 1,
  nfceContingencyEnabled: true,
  nfceCancellationWindowMinutes: 30,
  issuer: EMITENTE_PADRAO,
  emission: EMISSAO_PADRAO,
  email: {
    host: '',
    port: 587,
    security: 'STARTTLS',
    username: '',
    senderEmail: '',
    senderName: '',
  },
  pisCofins: {
    outbound: {
      cst: '01',
      baseReductionPercent: 0,
      pisRate: 1.65,
      cofinsRate: 7.6,
      revenueNature: '',
    },
    inbound: {
      cst: '50',
      baseReductionPercent: 0,
      pisRate: 1.65,
      cofinsRate: 7.6,
      revenueNature: '',
    },
  },
  nfe: {
    cfopInState: '5102',
    cfopOutOfState: '6102',
    operationNature: 'VENDA',
    nextNumber: 1,
    danfeOrientation: 'PORTRAIT',
    additionalInfo: '',
    emissionMode: 'NORMAL',
  },
  nfce: NFCE_PADRAO,
});

export const segredosVazios = (): SegredosDigitados => ({
  certificateBase64: '',
  certificateFileName: '',
  certificatePassword: '',
  csc: '',
  providerApiKey: '',
  providerTenantId: '',
  smtpPassword: '',
  nfceOfflinePassword: '',
});

export const segredosGravados = (config: FiscalCompanyConfig | null): SegredosGravados => ({
  certificado: Boolean(config?.certificateSecretRef),
  senhaCertificado: Boolean(config?.certificatePasswordSecretRef),
  csc: Boolean(config?.cscSecretRef),
  chaveProvedor: Boolean(config?.providerApiKeySecretRef),
  tenantProvedor: Boolean(config?.providerTenantIdSecretRef),
  senhaSmtp: Boolean(config?.smtpPasswordSecretRef),
  senhaOffline: Boolean(config?.nfceOfflinePasswordSecretRef),
});

/** Config salva por cima do padrao. Config antiga, de antes do assistente, nao
 *  tem os blocos novos: eles entram com o padrao e a serie que ja existia. */
export const deConfig = (config: FiscalCompanyConfig | null): FormularioFiscal => {
  const padrao = formularioPadrao();
  if (!config) return padrao;
  const issuer = config.issuer ?? padrao.issuer;
  const nfce = config.nfce ?? padrao.nfce;
  return {
    environment: config.environment,
    provider: config.provider,
    crt: config.crt,
    stateRegistration: config.stateRegistration,
    state: config.state,
    cscId: config.cscId ?? '',
    nfeSeries: config.nfeSeries,
    nfceSeries: config.nfceSeries,
    nfceContingencyEnabled: config.nfceContingencyEnabled ?? true,
    nfceCancellationWindowMinutes: config.nfceCancellationWindowMinutes ?? 30,
    issuer: {
      ...padrao.issuer,
      ...issuer,
      address: { ...padrao.issuer.address, ...issuer.address },
    },
    emission: { ...padrao.emission, ...config.emission },
    email: { ...padrao.email, ...config.email },
    pisCofins: config.pisCofins ?? padrao.pisCofins,
    nfe: { ...padrao.nfe, ...config.nfe },
    nfce: { ...padrao.nfce, ...nfce, danfe: { ...padrao.nfce.danfe, ...nfce.danfe } },
  };
};

/** Primeira linha do controle de series da NFC-e = serie padrao das vendas. Sem
 *  linha nenhuma (config de antes do assistente), fica a serie que ja estava gravada. */
export const serieNfcePadrao = (formulario: FormularioFiscal): number =>
  formulario.nfce.series[0]?.series ?? formulario.nfceSeries;
