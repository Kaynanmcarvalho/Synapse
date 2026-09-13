import type { BankAccountConfig } from '@synapse/types';
import type { Charge } from '../../finance/entities/boleto';
import { HOJE, liquidacao, pedido, titulo } from '../testing/fixtures';
import {
  dataDaQuitacao,
  detalheDaNota,
  detalheDoPedido,
  detalheDoTitulo,
  produtosDoPedido,
} from './documentos';

const NOTA = { numero: 4388, serie: 1, chaveDeAcesso: null, emitidaEm: '2026-08-20T10:00:00.000Z' };

const faturado = pedido({
  id: 'pedido-95',
  numero: 95,
  situacao: 'FATURADO',
  nota: NOTA,
  freteCentavos: 1_500,
  itens: [
    {
      productId: 'p1' as never,
      descricao: 'Farinha 5kg',
      quantidade: 60_000,
      precoUnitarioCentavos: 2_290,
      descontoCentavos: 400,
      totalCentavos: 137_000,
    },
  ],
});

const parcela = (numero: number, extra = {}) =>
  titulo({
    id: `t-${numero}`,
    orderId: 'pedido-95' as never,
    numeroParcela: numero,
    totalDeParcelas: 2,
    vencimento: numero === 1 ? '2026-09-17' : '2026-10-17',
    valorOriginalCentavos: 2_000,
    ...extra,
  });

describe('Pedido -> NF -> Titulo', () => {
  it('o pedido lista os titulos que gerou, com numero da nota e parcela', () => {
    const detalhe = detalheDoPedido(
      faturado,
      [parcela(2), parcela(1), titulo({ id: 'outro' })],
      HOJE,
    );
    expect(detalhe.titulos.map((t) => [t.id, t.numero, t.serie, t.parcela])).toEqual([
      ['t-1', '4388', '1', '1/2'],
      ['t-2', '4388', '1', '2/2'],
    ]);
  });

  it('a nota aponta para o pedido de origem e para os titulos', () => {
    const nota = detalheDaNota(faturado, [parcela(1)], HOJE);
    expect(nota).toMatchObject({
      pedidoId: 'pedido-95',
      pedidoNumero: 95,
      numero: 4388,
      serie: 1,
      produtosCentavos: 137_400,
      descontoCentavos: 0,
      freteCentavos: 1_500,
    });
    expect(nota?.titulos.map((t) => t.id)).toEqual(['t-1']);
  });

  it('o que o Synapse nao guarda volta como ausente, e nao inventado', () => {
    const nota = detalheDaNota(faturado, [], HOJE);
    expect(nota).toMatchObject({
      situacaoFiscal: null,
      xmlDisponivel: false,
      danfeDisponivel: false,
    });
  });

  it('pedido sem nota nao tem detalhe de nota', () => {
    expect(detalheDaNota(pedido(), [], HOJE)).toBeNull();
  });

  it('nota de pedido cancelado carrega a situacao do pedido', () => {
    expect(detalheDaNota({ ...faturado, situacao: 'CANCELADO' }, [], HOJE)?.pedidoSituacao).toBe(
      'CANCELADO',
    );
  });

  it('o titulo aponta para a nota e para o pedido', () => {
    const detalhe = detalheDoTitulo({
      titulo: parcela(1),
      pedido: faturado,
      boleto: null,
      conta: null,
      eventosDoBoleto: [],
      nomes: new Map(),
      hoje: HOJE,
    });
    expect(detalhe).toMatchObject({ pedidoId: 'pedido-95', pedidoNumero: 95, numero: '4388' });
    expect(detalhe.nota?.numero).toBe(4388);
  });
});

describe('titulo a receber', () => {
  it('pagamento parcial: original, recebido e saldo', () => {
    const detalhe = detalheDoTitulo({
      titulo: parcela(1, {
        status: 'PARCIAL',
        liquidacoes: [
          liquidacao({ data: '2026-09-10', valorCentavos: 800, registradoPor: 'u1' as never }),
        ],
      }),
      pedido: faturado,
      boleto: null,
      conta: null,
      eventosDoBoleto: [],
      nomes: new Map([['u1', 'fernanda@synapse.dev']]),
      hoje: HOJE,
    });
    expect(detalhe).toMatchObject({
      valorOriginalCentavos: 2_000,
      recebidoCentavos: 800,
      saldoCentavos: 1_200,
      situacao: 'PARCIAL',
      diasParaVencer: 4,
      quitadoEm: null,
    });
    expect(detalhe.liquidacoes[0]).toMatchObject({
      registradoPorNome: 'fernanda@synapse.dev',
      diasEmRelacaoAoVencimento: -7,
    });
    expect(detalhe.eventos.map((e) => e.descricao)).toEqual([
      'Título gerado',
      'Recebimento parcial',
    ]);
  });

  it('vencido mostra os dias em atraso como negativo em diasParaVencer', () => {
    const detalhe = detalheDoTitulo({
      titulo: parcela(1, { vencimento: '2026-09-01' }),
      pedido: null,
      boleto: null,
      conta: null,
      eventosDoBoleto: [],
      nomes: new Map(),
      hoje: HOJE,
    });
    expect(detalhe.situacao).toBe('VENCIDO');
    expect(detalhe.diasParaVencer).toBe(-12);
  });

  it('quitado guarda o dia em que o saldo zerou', () => {
    const quitado = parcela(1, {
      status: 'QUITADO',
      liquidacoes: [
        liquidacao({ id: 'a', data: '2026-09-10', valorCentavos: 800 }),
        liquidacao({ id: 'b', data: '2026-09-20', valorCentavos: 1_200 }),
      ],
    });
    expect(dataDaQuitacao(quitado)).toBe('2026-09-20');
  });

  it('boleto mostra so os dados gravados e a integracao por API', () => {
    const boleto: Charge = {
      id: 'bol-1',
      tenantId: 'tenant-1',
      branchId: 'filial-1',
      accountId: 'conta-1',
      tituloId: 't-1',
      amountCentavos: 2_000,
      dueDate: '2026-09-17',
      status: 'REGISTERED',
      bank: {
        referencia: 'bol-1',
        nossoNumero: '000184',
        status: 'REGISTRADO',
        valorCentavos: 2_000,
        valorPagoCentavos: null,
        vencimento: '2026-09-17',
        linhaDigitavel: '74891.12345 67890.123456 78901.234567 8 99990000002000',
        codigoDeBarras: '748...',
        pdfUrl: null,
        pagoEm: null,
      },
      input: { finePercent: 2, interestPercent: 1, discountCentavos: 0 } as Charge['input'],
      installment: 1,
      createdAt: '2026-08-20T11:00:00.000Z',
    };
    const conta = {
      id: 'conta-1',
      bankId: 'SICREDI',
      apelido: 'Sicredi Matriz',
      sicredi: { carteira: '1' },
    } as unknown as BankAccountConfig;
    const detalhe = detalheDoTitulo({
      titulo: parcela(1),
      pedido: faturado,
      boleto,
      conta,
      eventosDoBoleto: [],
      nomes: new Map(),
      hoje: HOJE,
    });
    expect(detalhe.formaDeCobranca).toBe('BOLETO');
    expect(detalhe.boleto).toMatchObject({
      bancoId: 'SICREDI',
      carteira: '1',
      nossoNumero: '000184',
      numeroDoDocumento: 'bol-1',
      situacao: 'REGISTERED',
      situacaoNoBanco: 'REGISTRADO',
      multaPercentual: 2,
      jurosMensalPercentual: 1,
      pdfDisponivel: false,
      integracao: 'API',
    });
    expect(detalhe.boleto?.eventos.map((e) => e.codigo)).toEqual([null, 'REGISTRADO']);
  });
});

describe('produtosDoPedido', () => {
  it('soma o bruto dos itens em milesimos', () => {
    expect(produtosDoPedido(faturado)).toBe(137_400);
  });
});
