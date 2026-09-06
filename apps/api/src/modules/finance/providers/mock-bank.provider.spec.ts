import type { BankWebhookEvent } from '@synapse/types';
import { MockBankProvider } from './mock-bank.provider';

const TITULO = {
  referencia: 'REC-2026-0001',
  valorCentavos: 189_90,
  vencimento: '2026-10-15',
  pagador: { documento: '12345678000199', nome: 'Agropecuária Boi Gordo' },
};

const webhook = (tipo: string, referencia: string, valorCentavos?: number) => ({
  assinatura: null,
  headers: {},
  payload: { tipo, referencia, ...(valorCentavos === undefined ? {} : { valorCentavos }) },
});

describe('MockBankProvider', () => {
  let banco: MockBankProvider;

  beforeEach(() => {
    banco = new MockBankProvider();
  });

  // c22-8: os sete metodos do §56.
  describe('createBoleto', () => {
    it('registra o boleto com linha digitavel e codigo de barras', async () => {
      const boleto = await banco.createBoleto(TITULO);

      expect(boleto.status).toBe('REGISTRADO');
      expect(boleto.codigoDeBarras).toHaveLength(44);
      expect(boleto.linhaDigitavel).not.toHaveLength(0);
      expect(boleto.valorCentavos).toBe(189_90);
      expect(boleto.pagoEm).toBeNull();
    });

    it('e deterministico: a mesma referencia gera o mesmo nosso numero', async () => {
      const primeiro = await banco.createBoleto(TITULO);
      const outroBanco = new MockBankProvider();
      const segundo = await outroBanco.createBoleto(TITULO);

      expect(segundo.nossoNumero).toBe(primeiro.nossoNumero);
    });

    it('da nosso numero diferente para titulos diferentes', async () => {
      const a = await banco.createBoleto(TITULO);
      const b = await banco.createBoleto({ ...TITULO, referencia: 'REC-2026-0002' });

      expect(b.nossoNumero).not.toBe(a.nossoNumero);
    });
  });

  describe('getBoleto', () => {
    it('devolve o boleto registrado', async () => {
      const criado = await banco.createBoleto(TITULO);
      expect((await banco.getBoleto(criado.nossoNumero)).referencia).toBe(TITULO.referencia);
    });

    it('recusa nosso numero que nao existe', async () => {
      await expect(banco.getBoleto('00000000000')).rejects.toThrow(/não encontrado/);
    });
  });

  describe('cancelBoleto', () => {
    it('baixa o boleto registrado', async () => {
      const criado = await banco.createBoleto(TITULO);
      expect((await banco.cancelBoleto(criado.nossoNumero)).status).toBe('BAIXADO');
    });

    it('recusa baixar boleto ja liquidado', async () => {
      const criado = await banco.createBoleto(TITULO);
      await banco.handleWebhook(webhook('BOLETO_LIQUIDADO', TITULO.referencia));

      await expect(banco.cancelBoleto(criado.nossoNumero)).rejects.toThrow(/já liquidado/);
    });
  });

  describe('createPixCharge e getPixCharge', () => {
    it('cria cobranca ativa com copia e cola e prazo', async () => {
      const cobranca = await banco.createPixCharge({
        referencia: TITULO.referencia,
        valorCentavos: 5_000,
        expiracaoSegundos: 3600,
      });

      expect(cobranca.status).toBe('ATIVA');
      expect(cobranca.txid).toHaveLength(26);
      expect(cobranca.copiaECola).toContain(cobranca.txid);
      expect(new Date(cobranca.expiraEm).getTime()).toBeGreaterThan(Date.now());
    });

    it('consulta a cobranca criada e recusa txid desconhecido', async () => {
      const criada = await banco.createPixCharge({
        referencia: TITULO.referencia,
        valorCentavos: 5_000,
        expiracaoSegundos: 60,
      });

      expect((await banco.getPixCharge(criada.txid)).referencia).toBe(TITULO.referencia);
      await expect(banco.getPixCharge('nao-existe')).rejects.toThrow(/não encontrada/);
    });
  });

  describe('getTransactions', () => {
    it('devolve so o que cai dentro do periodo', async () => {
      banco.semearLancamento({
        id: 'a',
        data: '2026-01-10T12:00:00.000Z',
        tipo: 'DEBITO',
        valorCentavos: 100,
        descricao: 'Tarifa',
        documento: null,
        referencia: null,
      });
      banco.semearLancamento({
        id: 'b',
        data: '2026-03-10T12:00:00.000Z',
        tipo: 'CREDITO',
        valorCentavos: 200,
        descricao: 'Depósito',
        documento: null,
        referencia: null,
      });

      const extrato = await banco.getTransactions({ de: '2026-01-01', ate: '2026-02-01' });

      expect(extrato).toHaveLength(1);
      expect(extrato[0]?.id).toBe('a');
    });
  });

  describe('handleWebhook', () => {
    it('liquida o boleto e lanca o credito no extrato', async () => {
      const criado = await banco.createBoleto(TITULO);

      const evento = await banco.handleWebhook(webhook('BOLETO_LIQUIDADO', TITULO.referencia));

      expect(evento.kind).toBe('BOLETO_LIQUIDADO');
      const liquidado = await banco.getBoleto(criado.nossoNumero);
      expect(liquidado.status).toBe('LIQUIDADO');
      expect(liquidado.valorPagoCentavos).toBe(189_90);
      expect(liquidado.pagoEm).not.toBeNull();

      const extrato = await banco.getTransactions({ de: '2000-01-01', ate: '2100-01-01' });
      expect(extrato).toHaveLength(1);
      expect(extrato[0]?.referencia).toBe(TITULO.referencia);
    });

    it('registra pagamento a menor pelo valor que o banco informou', async () => {
      const criado = await banco.createBoleto(TITULO);
      await banco.handleWebhook(webhook('BOLETO_LIQUIDADO', TITULO.referencia, 100_00));

      expect((await banco.getBoleto(criado.nossoNumero)).valorPagoCentavos).toBe(100_00);
    });

    it('conclui a cobranca Pix', async () => {
      const criada = await banco.createPixCharge({
        referencia: TITULO.referencia,
        valorCentavos: 5_000,
        expiracaoSegundos: 60,
      });

      await banco.handleWebhook(webhook('PIX_CONCLUIDO', TITULO.referencia));

      const concluida = await banco.getPixCharge(criada.txid);
      expect(concluida.status).toBe('CONCLUIDA');
      expect(concluida.pagoEm).not.toBeNull();
    });

    // Notificacao que nao entendemos nao pode virar baixa: ela e registrada
    // como desconhecida, com o corpo cru, e nao move dinheiro nenhum.
    it('marca como desconhecido o que nao sabe interpretar, sem mexer no titulo', async () => {
      const criado = await banco.createBoleto(TITULO);

      const evento: BankWebhookEvent = await banco.handleWebhook({
        assinatura: null,
        headers: {},
        payload: { algo: 'inesperado' },
      });

      expect(evento.kind).toBe('DESCONHECIDO');
      expect(evento.payload).toEqual({ algo: 'inesperado' });
      expect((await banco.getBoleto(criado.nossoNumero)).status).toBe('REGISTRADO');
      expect(await banco.getTransactions({ de: '2000-01-01', ate: '2100-01-01' })).toHaveLength(0);
    });

    it('ignora notificacao de titulo que nao e nosso', async () => {
      const criado = await banco.createBoleto(TITULO);
      await banco.handleWebhook(webhook('BOLETO_LIQUIDADO', 'REC-DE-OUTRA-EMPRESA'));

      expect((await banco.getBoleto(criado.nossoNumero)).status).toBe('REGISTRADO');
    });
  });

  it('anuncia qual banco e qual ambiente representa', () => {
    expect(banco.environment).toBe('MOCK');
    expect(banco.bankId).toBe('SICREDI');
  });
});
