import type {
  FiscalEmailSettings,
  FiscalEmissionSettings,
  FiscalEnvironment,
  FiscalIssuer,
  NfceSettings,
  NfeSettings,
  PisCofinsDefaults,
} from '@synapse/types';

export type EtapaId = 'empresa' | 'nota-fiscal' | 'nfe' | 'nfce' | 'sincronia' | 'conclusao';

export interface Aba {
  readonly id: string;
  readonly rotulo: string;
}

export interface Etapa {
  readonly id: EtapaId;
  readonly rotulo: string;
  readonly descricao: string;
  readonly abas: readonly Aba[];
}

/** O que o usuario edita. Os blocos usam os mesmos tipos da API, entao ida e
 *  volta nao precisam de traducao campo a campo. */
export interface FormularioFiscal {
  readonly environment: FiscalEnvironment;
  readonly provider: 'MOCK' | 'GYN_FISCAL';
  readonly crt: 1 | 2 | 3 | 4;
  readonly stateRegistration: string;
  readonly state: string;
  readonly cscId: string;
  readonly nfeSeries: number;
  /** Serie da NFC-e ja gravada; vale enquanto o controle de series estiver vazio. */
  readonly nfceSeries: number;
  readonly nfceContingencyEnabled: boolean;
  readonly nfceCancellationWindowMinutes: number;
  readonly issuer: FiscalIssuer;
  readonly emission: FiscalEmissionSettings;
  readonly email: FiscalEmailSettings;
  readonly pisCofins: PisCofinsDefaults;
  readonly nfe: NfeSettings;
  readonly nfce: NfceSettings;
}

/** Segredos digitados nesta visita. Vazio = manter o que ja esta no cofre. */
export interface SegredosDigitados {
  readonly certificateBase64: string;
  readonly certificateFileName: string;
  readonly certificatePassword: string;
  readonly csc: string;
  readonly providerApiKey: string;
  readonly providerTenantId: string;
  readonly smtpPassword: string;
  readonly nfceOfflinePassword: string;
}

/** A API devolve so a referencia do cofre: da para saber que existe, nao o valor. */
export interface SegredosGravados {
  readonly certificado: boolean;
  readonly senhaCertificado: boolean;
  readonly csc: boolean;
  readonly chaveProvedor: boolean;
  readonly tenantProvedor: boolean;
  readonly senhaSmtp: boolean;
  readonly senhaOffline: boolean;
}

export interface Pendencia {
  readonly etapa: EtapaId;
  readonly aba?: string;
  readonly mensagem: string;
  /** A API recusaria o valor: impede salvar. As outras so avisam. */
  readonly bloqueia: boolean;
}

export type AlterarFormulario = (mudar: (atual: FormularioFiscal) => FormularioFiscal) => void;
export type AlterarSegredo = (chave: keyof SegredosDigitados, valor: string) => void;

/** O que toda etapa recebe da tela do assistente. */
export interface PropsDeEtapa {
  readonly formulario: FormularioFiscal;
  readonly alterar: AlterarFormulario;
  readonly segredos: SegredosDigitados;
  readonly gravados: SegredosGravados;
  readonly alterarSegredo: AlterarSegredo;
  readonly aba: string;
  readonly aoMudarAba: (aba: string) => void;
}
