import type { Liquidacao, PedidoDeVenda, Titulo } from '@synapse/types';
import {
  carteiraDoCliente,
  diasVencidos,
  identificacaoDoTitulo,
  notasDosPedidos,
  pagamentosDoCliente,
  prazoMedio,
  resumoFinanceiro,
  titulosEmAbertoDoCliente,
} from './analise-de-credito';

const HOJE = '2026-06-15';
const CLIENTE = 'cliente-1';

const liquidacao = (extra: Partial<Liquidacao> = {}): Liquidacao =>
  ({
    id: 'L-1',
    data: '2026-06-10',
    valorCentavos: 10_000,
    forma: 'PIX',
    observacao: null,
    referenciaBancaria: null,
    registradoPor: 'user-1',
    registradoEm: '2026-06-10T12:00:00.000Z',
    ...extra,
  }) as Liquidacao;

const titulo = (extra: Partial<Titulo> = {}): Titulo =>
  ({
    id: 'abcdef12-3456',
    tenantId: 'tenant-1',
    branchId: 'filial-1',
    tipo: 'RECEBER',
    descricao: 'Pedido 1',
    customerId: CLIENTE,
    fornecedorId: null,
    orderId: null,
    numeroParcela: 1,
    totalDeParcelas: 3,
    valorOriginalCentavos: 10_000,
    vencimento: '2026-06-10',
    status: 'ABERTO',
    liquidacoes: [],
    centroDeCustoId: null,
    categoriaId: null,
    renegociadoDe: null,
    renegociadoPara: [],
    criadoEm: '2026-05-01T00:00:00.000Z',
    criadoPor: 'user-1',
    ...extra,
  }) as Titulo;

const pedido = (extra: Partial<PedidoDeVenda> = {}): PedidoDeVenda =>
  ({
    id: 'pedido-1',
    numero: 1,
    tenantId: 'tenant-1',
    branchId: 'filial-1',
    customerId: CLIENTE,
    clienteNome: 'Mercado do Bairro',
    clienteDocumento: '00000000000191',
    tipo: 'VENDA',
    situacao: 'FATURADO',
    origem: 'MOBILE',
    vendedorId: 'user-9',
    vendedorNome: 'Ana',
    condicaoDePagamento: '28/35/42 dias',
    prazoMedioEmDias: 35,
    formaDePagamento: 'Boleto',
    totalCentavos: 30_000,
    descontoCentavos: 0,
    itens: [],
    observacao: null,
    nota: { numero: 4412, serie: 1, chaveDeAcesso: null, emitidaEm: '2026-06-01T10:00:00.000Z' },
    enviadoEm: '2026-05-30T10:00:00.000Z',
    analisadoEm: null,
    analisadoPor: null,
    ...extra,
  }) as PedidoDeVenda;

const semPedidos = new Map<string, PedidoDeVenda>();

describe('identificacao do titulo', () => {
  it('usa numero e serie da nota quando o pedido ja foi faturado', () => {
    const faturado = pedido();
    const mapa = new Map([[faturado.id, faturado]]);
    const ligado = titulo({ orderId: faturado.id as Titulo['orderId'] });
    expect(identificacaoDoTitulo(ligado, mapa)).toEqual({
      numero: '4412',
      serie: '1',
      parcela: '1/3',
    });
  });

  it('sem nota, cai para a identificacao do proprio titulo', () => {
    expect(identificacaoDoTitulo(titulo(), semPedidos)).toEqual({
      numero: 'ABCDEF12',
      serie: '—',
      parcela: '1/3',
    });
  });
});

describe('titulos em aberto', () => {
  it('conta so o que ainda pesa, do cliente, e mede o atraso', () => {
    const lista = titulosEmAbertoDoCliente(
      [
        titulo({ id: 'vencido', vencimento: '2026-06-01' }),
        titulo({ id: 'a-vencer', vencimento: '2026-07-01' }),
        titulo({ id: 'quitado', liquidacoes: [liquidacao({ valorCentavos: 10_000 })] }),
        titulo({ id: 'cancelado', status: 'CANCELADO' }),
        titulo({ id: 'de-outro', customerId: 'cliente-2' as Titulo['customerId'] }),
        titulo({ id: 'a-pagar', tipo: 'PAGAR', customerId: null }),
      ],
      CLIENTE,
      semPedidos,
      HOJE,
    );

    expect(lista.map((t) => t.id)).toEqual(['vencido', 'a-vencer']);
    expect(lista[0]?.diasDeAtraso).toBe(14);
    expect(lista[1]?.diasDeAtraso).toBe(0);
  });

  it('titulo parcial mostra o saldo, e nao o valor original', () => {
    const [aberto] = titulosEmAbertoDoCliente(
      [titulo({ liquidacoes: [liquidacao({ valorCentavos: 4_000 })] })],
      CLIENTE,
      semPedidos,
      HOJE,
    );
    expect(aberto).toMatchObject({ valorCentavos: 10_000, saldoCentavos: 6_000 });
  });

  it('diasVencidos e zero antes do vencimento', () => {
    expect(diasVencidos(titulo({ vencimento: '2026-07-01' }), HOJE)).toBe(0);
    expect(diasVencidos(titulo({ vencimento: '2026-06-05' }), HOJE)).toBe(10);
  });
});

describe('pagamentos do cliente', () => {
  it('marca 0 em dia, negativo antecipado e positivo em atraso', () => {
    const pagamentos = pagamentosDoCliente(
      [
        titulo({ id: 'em-dia', vencimento: '2026-06-10', liquidacoes: [liquidacao()] }),
        titulo({
          id: 'antecipado',
          vencimento: '2026-06-10',
          liquidacoes: [liquidacao({ data: '2026-06-09' })],
        }),
        titulo({
          id: 'atrasado',
          vencimento: '2026-06-01',
          liquidacoes: [liquidacao({ data: '2026-06-08' })],
        }),
      ],
      CLIENTE,
      semPedidos,
      150,
    );

    const porTitulo = Object.fromEntries(pagamentos.map((p) => [p.tituloId, p.diasDoPagamento]));
    expect(porTitulo).toEqual({ 'em-dia': 0, antecipado: -1, atrasado: 7 });
  });

  it('um titulo pago em duas vezes aparece duas vezes, do mais recente', () => {
    const pagamentos = pagamentosDoCliente(
      [
        titulo({
          liquidacoes: [
            liquidacao({ id: 'L-1', data: '2026-05-02', valorCentavos: 4_000 }),
            liquidacao({ id: 'L-2', data: '2026-06-02', valorCentavos: 6_000 }),
          ],
        }),
      ],
      CLIENTE,
      semPedidos,
      150,
    );
    expect(pagamentos.map((p) => p.pagoEm)).toEqual(['2026-06-02', '2026-05-02']);
  });

  it('respeita o limite de registros', () => {
    const muitos = Array.from({ length: 10 }, (_, indice) =>
      titulo({ id: `t-${indice}`, liquidacoes: [liquidacao({ data: `2026-06-0${indice % 9}` })] }),
    );
    expect(pagamentosDoCliente(muitos, CLIENTE, semPedidos, 3)).toHaveLength(3);
  });
});

describe('carteira do cliente', () => {
  it('separa total vencido, a vencer e pago', () => {
    const carteira = carteiraDoCliente(
      [
        titulo({ id: 'vencido', vencimento: '2026-06-01', valorOriginalCentavos: 25_000 }),
        titulo({ id: 'a-vencer', vencimento: '2026-07-01', valorOriginalCentavos: 40_000 }),
        titulo({
          id: 'pago',
          vencimento: '2026-05-20',
          liquidacoes: [liquidacao({ data: '2026-05-20' })],
        }),
      ],
      CLIENTE,
      semPedidos,
      HOJE,
      150,
    );

    expect(carteira.totalVencidoCentavos).toBe(25_000);
    expect(carteira.totalAVencerCentavos).toBe(40_000);
    expect(carteira.totalPagoCentavos).toBe(10_000);
    expect(carteira.titulosEmAberto).toHaveLength(2);
    expect(carteira.pagamentos).toHaveLength(1);
  });
});

describe('resumo financeiro do cliente', () => {
  it('soma vencido, a vencer e o maior atraso', () => {
    const resumo = resumoFinanceiro(
      [
        titulo({ id: 'atrasado-14', vencimento: '2026-06-01', valorOriginalCentavos: 25_000 }),
        titulo({ id: 'atrasado-45', vencimento: '2026-05-01', valorOriginalCentavos: 10_000 }),
        titulo({ id: 'a-vencer', vencimento: '2026-07-01', valorOriginalCentavos: 40_000 }),
        titulo({ id: 'pago', liquidacoes: [liquidacao({ valorCentavos: 10_000 })] }),
      ],
      CLIENTE,
      HOJE,
    );
    expect(resumo).toEqual({
      vencidoCentavos: 35_000,
      aVencerCentavos: 40_000,
      titulosVencidos: 2,
      diasDeAtrasoMaximo: 45,
    });
  });

  it('cliente sem titulo nao inventa divida', () => {
    expect(resumoFinanceiro([], CLIENTE, HOJE)).toEqual({
      vencidoCentavos: 0,
      aVencerCentavos: 0,
      titulosVencidos: 0,
      diasDeAtrasoMaximo: 0,
    });
  });
});

describe('notas e prazo', () => {
  it('lista so pedidos com nota, do mais recente', () => {
    const notas = notasDosPedidos(
      [
        pedido({ id: 'sem-nota', nota: null }),
        pedido({
          id: 'antiga',
          nota: { numero: 1, serie: 1, chaveDeAcesso: null, emitidaEm: '2026-01-01T10:00:00.000Z' },
        }),
        pedido({ id: 'recente' }),
      ],
      150,
    );
    expect(notas.map((n) => n.pedidoId)).toEqual(['recente', 'antiga']);
  });

  it('prazo medio sai dos vencimentos combinados', () => {
    expect(prazoMedio([28, 35, 42])).toBe(35);
    expect(prazoMedio([])).toBe(0);
  });
});
