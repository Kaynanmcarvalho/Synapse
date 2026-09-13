/** Parametros do Assistente de Configuracao de NF-e — as mesmas etapas do Syndata.
 *  Ficam dentro da FiscalCompanyConfig. Segredos (senha do SMTP, senha da
 *  contingencia offline) nunca aparecem aqui: so a referencia opaca no cofre. */

export type FiscalPersonType = 'PJ' | 'PF';

export interface FiscalAddress {
  readonly zipCode: string;
  readonly street: string;
  readonly number: string;
  readonly complement: string;
  readonly district: string;
  /** Codigo IBGE do municipio (7 digitos). */
  readonly cityCode: string;
  readonly cityName: string;
  /** Codigo BACEN do pais; 1058 = Brasil. */
  readonly countryCode: string;
}

/** Estabelecimento emissor. CRT, UF e inscricao estadual continuam no nivel de
 *  cima da FiscalCompanyConfig, onde a emissao ja os le. */
export interface FiscalIssuer {
  readonly personType: FiscalPersonType;
  /** CNPJ ou CPF, so digitos. */
  readonly document: string;
  readonly legalName: string;
  readonly tradeName: string;
  readonly municipalRegistration: string;
  readonly suframaRegistration: string;
  readonly address: FiscalAddress;
  readonly phone: string;
  readonly phone2: string;
  readonly fax: string;
  readonly email: string;
  readonly responsible: string;
  readonly cnae: string;
  readonly accountantDocument: string;
  readonly accountantName: string;
}

/** O que o faturamento leva para a observacao da nota do pedido. */
export type BillingNoteContent = 'DUE_DATES' | 'AMOUNTS' | 'BOTH';

export interface FiscalEmissionSettings {
  readonly reuseLastNote: boolean;
  readonly showAuthorizationReceipt: boolean;
  readonly receivablesInXml: boolean;
  readonly billingInOrderNote: boolean;
  readonly billingNoteContent: BillingNoteContent;
  readonly sellerInNote: boolean;
  readonly customerEmailInXml: boolean;
  readonly allowGenericNumbering: boolean;
  readonly accountantXmlAuthorization: boolean;
  readonly freightInNote: boolean;
  readonly orderNumberInNote: boolean;
  readonly customerTradeNameInNote: boolean;
  readonly removeAccents: boolean;
  /** CPF ou CNPJ autorizado a baixar o XML (grupo autXML), so digitos. */
  readonly xmlDownloadDocument: string;
  readonly paymentBeneficiaryCnpj: string;
  readonly autoSendEmail: boolean;
}

export type SmtpSecurity = 'SSL' | 'STARTTLS' | 'NONE';

export interface FiscalEmailSettings {
  readonly host: string;
  readonly port: number;
  readonly security: SmtpSecurity;
  readonly username: string;
  readonly senderEmail: string;
  readonly senderName: string;
}

export interface PisCofinsDefault {
  readonly cst: string;
  readonly baseReductionPercent: number;
  readonly pisRate: number;
  readonly cofinsRate: number;
  readonly revenueNature: string;
}

export interface PisCofinsDefaults {
  readonly outbound: PisCofinsDefault;
  readonly inbound: PisCofinsDefault;
}

/** NF-e: contingencia = SVC. NFC-e: contingencia = offline. */
export type FiscalEmissionMode = 'NORMAL' | 'CONTINGENCY';

export interface NfeSettings {
  readonly cfopInState: string;
  readonly cfopOutOfState: string;
  readonly operationNature: string;
  /** Numero da primeira NF-e emitida pelo Synapse na serie configurada. */
  readonly nextNumber: number;
  readonly danfeOrientation: 'PORTRAIT' | 'LANDSCAPE';
  readonly additionalInfo: string;
  readonly emissionMode: FiscalEmissionMode;
}

export type NfceSeriesMode = 'TERMINAL' | 'USER';

export interface NfceSeriesAssignment {
  readonly id: string;
  /** Identificador do dispositivo (modo terminal) ou e-mail do usuario. */
  readonly identifier: string;
  readonly system: 'RETAGUARDA' | 'PDV';
  readonly name: string;
  readonly series: number;
  readonly nextNumber: number;
}

export interface NfceDanfeSettings {
  readonly style: 'MINI_PRINTER' | 'A4';
  readonly detailed: boolean;
  readonly productAdditionalInfo: boolean;
  readonly approximateTaxes: boolean;
  readonly a4Layout: 'STANDARD' | 'COMPACT';
  readonly unidentifiedConsumerName: boolean;
  readonly cutPaper: boolean;
  readonly orderPassword: boolean;
  readonly registerNumber: boolean;
  readonly additionalInfo: string;
}

export interface NfceBrandCode {
  readonly brand: string;
  readonly code: string;
}

/** Credenciadora de cartao (grupo card da NFC-e). */
export interface NfceAcquirer {
  readonly id: string;
  readonly legalName: string;
  readonly tradeName: string;
  readonly cnpj: string;
  readonly establishmentCodes: readonly string[];
  readonly brandCodes: readonly NfceBrandCode[];
}

export interface NfceSettings {
  readonly cfopInState: string;
  readonly openEmissionScreen: boolean;
  readonly seriesMode: NfceSeriesMode;
  /** A primeira linha e a serie padrao das vendas. */
  readonly series: readonly NfceSeriesAssignment[];
  readonly danfe: NfceDanfeSettings;
  readonly emissionMode: FiscalEmissionMode;
  readonly requireOfflinePassword: boolean;
  readonly acquirers: readonly NfceAcquirer[];
}
