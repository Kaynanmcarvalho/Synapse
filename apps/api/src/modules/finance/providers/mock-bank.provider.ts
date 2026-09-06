import { Injectable, NotFoundException } from '@nestjs/common';
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
import { createHash, randomUUID } from 'node:crypto';

/** Banco de mentira, completo e deterministico.
 *
 *  E o provider que o desenvolvimento e os testes usam de verdade: enquanto o
 *  contrato de Sicredi e Itau nao chega, e aqui que o financeiro roda de ponta
 *  a ponta — emitir boleto, receber a baixa por webhook, conciliar extrato.
 *
 *  Deterministico de proposito: nosso numero, linha digitavel e txid saem de um
 *  hash da referencia, entao o mesmo titulo gera sempre os mesmos valores e o
 *  teste pode afirmar igualdade em vez de "existe alguma coisa". */
@Injectable()
export class MockBankProvider implements BankProvider {
  readonly bankId: BankId = 'SICREDI';
  readonly environment: BankEnvironment = 'MOCK';

  private readonly boletos = new Map<string, Boleto>();
  private readonly pix = new Map<string, PixCharge>();
  private readonly lancamentos: BankTransaction[] = [];

  private digitos(semente: string, tamanho: number): string {
    const hash = createHash('sha256').update(semente).digest('hex');
    return BigInt(`0x${hash}`).toString().padStart(tamanho, '0').slice(0, tamanho);
  }

  createBoleto(input: CriarBoletoInput): Promise<Boleto> {
    const nossoNumero = this.digitos(`boleto:${input.referencia}`, 11);
    const codigoDeBarras = this.digitos(`barras:${input.referencia}`, 44);
    const boleto: Boleto = {
      referencia: input.referencia,
      nossoNumero,
      status: 'REGISTRADO',
      valorCentavos: input.valorCentavos,
      valorPagoCentavos: null,
      vencimento: input.vencimento,
      codigoDeBarras,
      linhaDigitavel: codigoDeBarras.replace(
        /(\d{5})(\d{5})(\d{5})(\d{6})(\d{5})/,
        '$1.$2 $3.$4 $5',
      ),
      pdfUrl: `mock://boletos/${nossoNumero}.pdf`,
      pagoEm: null,
    };
    this.boletos.set(nossoNumero, boleto);
    return Promise.resolve(boleto);
  }

  // async de proposito: metodo que devolve Promise tem que rejeitar, nao
  // lancar na hora — quem chama com .catch() nao pegaria um throw sincrono.
  async getBoleto(nossoNumero: string): Promise<Boleto> {
    const boleto = this.boletos.get(nossoNumero);
    if (!boleto) throw new NotFoundException(`Boleto ${nossoNumero} não encontrado`);
    return boleto;
  }

  async cancelBoleto(nossoNumero: string): Promise<Boleto> {
    const boleto = await this.getBoleto(nossoNumero);
    if (boleto.status === 'LIQUIDADO') {
      throw new NotFoundException('Boleto já liquidado não pode ser baixado');
    }
    const baixado: Boleto = { ...boleto, status: 'BAIXADO' };
    this.boletos.set(nossoNumero, baixado);
    return baixado;
  }

  createPixCharge(input: CriarPixInput): Promise<PixCharge> {
    const txid = this.digitos(`pix:${input.referencia}`, 26);
    const cobranca: PixCharge = {
      referencia: input.referencia,
      txid,
      status: 'ATIVA',
      valorCentavos: input.valorCentavos,
      copiaECola: `00020126MOCK${txid}5204000053039865802BR`,
      qrCodeBase64: null,
      expiraEm: new Date(Date.now() + input.expiracaoSegundos * 1000).toISOString(),
      pagoEm: null,
    };
    this.pix.set(txid, cobranca);
    return Promise.resolve(cobranca);
  }

  async getPixCharge(txid: string): Promise<PixCharge> {
    const cobranca = this.pix.get(txid);
    if (!cobranca) throw new NotFoundException(`Cobrança Pix ${txid} não encontrada`);
    return cobranca;
  }

  getTransactions(consulta: ConsultaDeExtrato): Promise<readonly BankTransaction[]> {
    return Promise.resolve(
      this.lancamentos.filter((l) => l.data >= consulta.de && l.data <= consulta.ate),
    );
  }

  /** O mock aceita o formato que o proprio mock emite. Um banco de verdade tem
   *  o seu, e e por isso que o parse mora no provider e nao no financeiro. */
  handleWebhook(recebido: WebhookRecebido): Promise<BankWebhookEvent> {
    const corpo = (recebido.payload ?? {}) as Record<string, unknown>;
    const tipo = typeof corpo['tipo'] === 'string' ? corpo['tipo'] : '';
    const referencia = typeof corpo['referencia'] === 'string' ? corpo['referencia'] : null;
    const valorCentavos =
      typeof corpo['valorCentavos'] === 'number' ? corpo['valorCentavos'] : null;

    const kind =
      tipo === 'BOLETO_LIQUIDADO' || tipo === 'BOLETO_BAIXADO' || tipo === 'PIX_CONCLUIDO'
        ? tipo
        : 'DESCONHECIDO';

    if (kind !== 'DESCONHECIDO' && referencia) this.aplicar(kind, referencia, valorCentavos);

    return Promise.resolve({
      kind,
      bankId: this.bankId,
      referencia,
      valorCentavos,
      ocorridoEm: new Date().toISOString(),
      payload: recebido.payload,
    });
  }

  private aplicar(
    kind: 'BOLETO_LIQUIDADO' | 'BOLETO_BAIXADO' | 'PIX_CONCLUIDO',
    referencia: string,
    valorCentavos: number | null,
  ): void {
    const agora = new Date().toISOString();

    for (const [chave, boleto] of this.boletos) {
      if (boleto.referencia !== referencia) continue;
      if (kind === 'BOLETO_LIQUIDADO') {
        this.boletos.set(chave, {
          ...boleto,
          status: 'LIQUIDADO',
          valorPagoCentavos: valorCentavos ?? boleto.valorCentavos,
          pagoEm: agora,
        });
        this.creditar(referencia, valorCentavos ?? boleto.valorCentavos, agora, 'Boleto liquidado');
      }
      if (kind === 'BOLETO_BAIXADO') this.boletos.set(chave, { ...boleto, status: 'BAIXADO' });
    }

    if (kind !== 'PIX_CONCLUIDO') return;
    for (const [chave, cobranca] of this.pix) {
      if (cobranca.referencia !== referencia) continue;
      this.pix.set(chave, { ...cobranca, status: 'CONCLUIDA', pagoEm: agora });
      this.creditar(referencia, valorCentavos ?? cobranca.valorCentavos, agora, 'Pix recebido');
    }
  }

  private creditar(
    referencia: string,
    valorCentavos: number,
    data: string,
    descricao: string,
  ): void {
    this.lancamentos.push({
      id: randomUUID(),
      data,
      tipo: 'CREDITO',
      valorCentavos,
      descricao,
      documento: null,
      referencia,
    });
  }

  /** Só para teste e desenvolvimento: injeta um lançamento no extrato. */
  semearLancamento(lancamento: BankTransaction): void {
    this.lancamentos.push(lancamento);
  }
}
