/** Uma interface bancaria so, com implementacoes por banco (§56).
 *
 *  O financeiro fala com BankProvider e nunca com um banco em particular:
 *  adicionar um banco novo e escrever uma classe e registra-la, sem tocar em
 *  contas a receber, a pagar ou conciliacao. */

export const BANK_IDS = [
  'SICREDI',
  'ITAU',
  'BANCO_DO_BRASIL',
  'BRADESCO',
  'SANTANDER',
  'SICOOB',
] as const;

export type BankId = (typeof BANK_IDS)[number];

/** Ambientes separados por banco: uma empresa pode estar em producao no Sicredi
 *  e ainda em homologacao no Itau. */
export const BANK_ENVIRONMENTS = ['MOCK', 'SANDBOX', 'HOMOLOGACAO', 'PRODUCAO'] as const;

export type BankEnvironment = (typeof BANK_ENVIRONMENTS)[number];

export type BoletoStatus =
  'PENDENTE' | 'REGISTRADO' | 'LIQUIDADO' | 'BAIXADO' | 'VENCIDO' | 'REJEITADO';

export type PixChargeStatus = 'ATIVA' | 'CONCLUIDA' | 'REMOVIDA' | 'EXPIRADA';

export interface Pagador {
  readonly documento: string;
  readonly nome: string;
  readonly logradouro?: string;
  readonly numero?: string;
  readonly bairro?: string;
  readonly cidade?: string;
  readonly uf?: string;
  readonly cep?: string;
}

export interface CriarBoletoInput {
  /** Identificador do titulo no Synapse. Vai ao banco como "seu numero" e e o
   *  que amarra a baixa de volta ao contas a receber. */
  readonly referencia: string;
  readonly valorCentavos: number;
  readonly vencimento: string;
  readonly pagador: Pagador;
  readonly instrucoes?: readonly string[];
  readonly multaPercentual?: number;
  readonly jurosMensalPercentual?: number;
  readonly descontoCentavos?: number;
}

export interface Boleto {
  readonly referencia: string;
  readonly nossoNumero: string;
  readonly status: BoletoStatus;
  readonly valorCentavos: number;
  readonly valorPagoCentavos: number | null;
  readonly vencimento: string;
  readonly linhaDigitavel: string;
  readonly codigoDeBarras: string;
  readonly pdfUrl: string | null;
  readonly pagoEm: string | null;
}

export interface CriarPixInput {
  readonly referencia: string;
  readonly valorCentavos: number;
  /** Segundos ate expirar. */
  readonly expiracaoSegundos: number;
  readonly pagador?: Pagador;
  readonly descricao?: string;
}

export interface PixCharge {
  readonly referencia: string;
  readonly txid: string;
  readonly status: PixChargeStatus;
  readonly valorCentavos: number;
  readonly copiaECola: string;
  readonly qrCodeBase64: string | null;
  readonly expiraEm: string;
  readonly pagoEm: string | null;
}

export interface ConsultaDeExtrato {
  readonly de: string;
  readonly ate: string;
}

export type TipoDeLancamento = 'CREDITO' | 'DEBITO';

export interface BankTransaction {
  readonly id: string;
  readonly data: string;
  readonly tipo: TipoDeLancamento;
  readonly valorCentavos: number;
  readonly descricao: string;
  readonly documento: string | null;
  /** Preenchido quando o banco devolve o identificador que mandamos no titulo —
   *  e o que permite conciliar sem adivinhar pelo valor. */
  readonly referencia: string | null;
}

export type BankWebhookKind =
  'BOLETO_LIQUIDADO' | 'BOLETO_BAIXADO' | 'PIX_CONCLUIDO' | 'DESCONHECIDO';

export interface BankWebhookEvent {
  readonly kind: BankWebhookKind;
  readonly bankId: BankId;
  readonly referencia: string | null;
  readonly valorCentavos: number | null;
  readonly ocorridoEm: string;
  /** O corpo cru, para auditoria e para reprocessar quando o parse evoluir. */
  readonly payload: unknown;
}

export interface WebhookRecebido {
  readonly assinatura: string | null;
  readonly headers: Readonly<Record<string, string>>;
  readonly payload: unknown;
}

/** Os sete metodos do §56. */
export interface BankProvider {
  readonly bankId: BankId;
  readonly environment: BankEnvironment;

  createBoleto(input: CriarBoletoInput): Promise<Boleto>;
  cancelBoleto(nossoNumero: string): Promise<Boleto>;
  getBoleto(nossoNumero: string): Promise<Boleto>;
  createPixCharge(input: CriarPixInput): Promise<PixCharge>;
  getPixCharge(txid: string): Promise<PixCharge>;
  getTransactions(consulta: ConsultaDeExtrato): Promise<readonly BankTransaction[]>;
  handleWebhook(recebido: WebhookRecebido): Promise<BankWebhookEvent>;
}

/** Configuracao do Sicredi (§20). Nada de segredo aqui dentro: o que fica
 *  guardado e a referencia ao cofre, e o valor so existe no backend (§62). */
export interface SicrediConfig {
  readonly cooperativa: string;
  readonly posto: string;
  readonly conta: string;
  readonly carteira: string;
  readonly chavePix: string;
  readonly clientIdSecretRef: string;
  readonly clientSecretSecretRef: string;
  readonly certificadoSecretRef: string;
}

/** Configuracao do Itau (§21). */
export interface ItauConfig {
  readonly agencia: string;
  readonly conta: string;
  readonly carteira: string;
  readonly chavePix: string;
  readonly clientIdSecretRef: string;
  readonly clientSecretSecretRef: string;
  readonly certificadoSecretRef: string;
}

export interface BankAccountConfig {
  readonly id: string;
  readonly bankId: BankId;
  readonly environment: BankEnvironment;
  readonly apelido: string;
  readonly ativo: boolean;
  /** URL base do ambiente. Fica em configuracao de proposito: nao inventamos o
   *  endereco de nenhum banco — ele entra quando a documentacao oficial chega. */
  readonly baseUrl: string | null;
  readonly sicredi?: SicrediConfig;
  readonly itau?: ItauConfig;
}
