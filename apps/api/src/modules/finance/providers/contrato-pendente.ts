import { ServiceUnavailableException } from '@nestjs/common';
import type {
  BankEnvironment,
  BankId,
  BankProvider,
  BankTransaction,
  BankWebhookEvent,
  Boleto,
  ConsultaDeExtrato,
  CriarBoletoInput,
  CriarPixInput,
  PixCharge,
  WebhookRecebido,
} from '@synapse/types';

/** O que falta para uma operacao sair do papel, dito no proprio erro.
 *
 *  A alternativa seria adivinhar caminho e nome de campo da API do banco. Um
 *  palpite errado nao falha na hora: ele passa pelo build, pelo teste e so
 *  aparece em homologacao com o banco, quando ja custa caro. Preferimos que a
 *  chamada recuse na cara e diga qual pagina da documentacao resolve. */
export class ContratoBancarioPendente extends ServiceUnavailableException {
  constructor(
    readonly bankId: BankId,
    readonly operacao: string,
    precisa: string,
  ) {
    super(
      `${bankId}: ${operacao} ainda não implementado — falta ${precisa}. ` +
        `O que está pendente por banco está em docs/BANKING.md.`,
    );
    this.name = 'ContratoBancarioPendente';
  }
}

const PENDENCIAS: Readonly<Record<string, string>> = {
  createBoleto: 'o endpoint de registro de cobrança e o nome dos campos do título',
  cancelBoleto: 'o endpoint de baixa e o código de motivo aceito',
  getBoleto: 'o endpoint de consulta e o mapa de situação do título',
  createPixCharge: 'o endpoint de cobrança imediata e o formato do txid',
  getPixCharge: 'o endpoint de consulta da cobrança',
  getTransactions: 'o endpoint de extrato, a paginação e o formato da data',
  handleWebhook: 'o formato da notificação e como validar a assinatura',
};

/** Base dos bancos reais: a configuracao, o ambiente e o cofre ja funcionam e
 *  sao testados; so a chamada HTTP espera a documentacao oficial. Cada banco
 *  sobrescreve o metodo conforme o contrato dele chega. */
export abstract class ProviderBancarioBase implements BankProvider {
  protected constructor(
    readonly bankId: BankId,
    readonly environment: BankEnvironment,
    protected readonly baseUrl: string,
  ) {}

  /** Sempre lancado de dentro de um metodo async: assim vira rejeicao de
   *  Promise, e nao um throw sincrono que escaparia do .catch() de quem chama. */
  protected pendente(operacao: keyof typeof PENDENCIAS): never {
    throw new ContratoBancarioPendente(this.bankId, operacao, PENDENCIAS[operacao] ?? 'o contrato');
  }

  async createBoleto(_input: CriarBoletoInput): Promise<Boleto> {
    return this.pendente('createBoleto');
  }

  async cancelBoleto(_nossoNumero: string): Promise<Boleto> {
    return this.pendente('cancelBoleto');
  }

  async getBoleto(_nossoNumero: string): Promise<Boleto> {
    return this.pendente('getBoleto');
  }

  async createPixCharge(_input: CriarPixInput): Promise<PixCharge> {
    return this.pendente('createPixCharge');
  }

  async getPixCharge(_txid: string): Promise<PixCharge> {
    return this.pendente('getPixCharge');
  }

  async getTransactions(_consulta: ConsultaDeExtrato): Promise<readonly BankTransaction[]> {
    return this.pendente('getTransactions');
  }

  async handleWebhook(_recebido: WebhookRecebido): Promise<BankWebhookEvent> {
    return this.pendente('handleWebhook');
  }
}
