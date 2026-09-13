import type {
  CadastroDoCliente,
  Liquidacao,
  PedidoDeVenda,
  SituacaoDeCredito,
  Titulo,
} from '@synapse/types';

/** Montadores de dados para os testes do credito: cada teste diz so o que
 *  importa para ele, e o resto vem com valores neutros. */

export const HOJE = '2026-09-13';
export const CLIENTE = 'cliente-1';

export const liquidacao = (extra: Partial<Liquidacao> = {}): Liquidacao =>
  ({
    id: 'L-1',
    data: '2026-09-01',
    valorCentavos: 10_000,
    forma: 'PIX',
    observacao: null,
    referenciaBancaria: null,
    registradoPor: 'user-1',
    registradoEm: '2026-09-01T12:00:00.000Z',
    ...extra,
  }) as Liquidacao;

export const titulo = (extra: Partial<Titulo> = {}): Titulo =>
  ({
    id: 'titulo-1',
    tenantId: 'tenant-1',
    branchId: 'filial-1',
    tipo: 'RECEBER',
    descricao: 'Pedido 1',
    customerId: CLIENTE,
    fornecedorId: null,
    orderId: null,
    numeroParcela: 1,
    totalDeParcelas: 1,
    valorOriginalCentavos: 10_000,
    vencimento: '2026-09-01',
    status: 'ABERTO',
    liquidacoes: [],
    centroDeCustoId: null,
    categoriaId: null,
    renegociadoDe: null,
    renegociadoPara: [],
    criadoEm: '2026-08-01T00:00:00.000Z',
    criadoPor: 'user-1',
    ...extra,
  }) as Titulo;

/** Titulo quitado com uma liquidacao so, `dias` depois do vencimento. */
export const pago = (id: string, vencimento: string, dias: number, valor = 10_000): Titulo => {
  const data = new Date(Date.parse(`${vencimento}T00:00:00.000Z`) + dias * 86_400_000)
    .toISOString()
    .slice(0, 10);
  return titulo({
    id,
    vencimento,
    valorOriginalCentavos: valor,
    status: 'QUITADO',
    liquidacoes: [liquidacao({ id: `${id}-L`, data, valorCentavos: valor })],
  });
};

export const pedido = (extra: Partial<PedidoDeVenda> = {}): PedidoDeVenda =>
  ({
    id: 'pedido-1',
    numero: 1,
    tenantId: 'tenant-1',
    branchId: 'filial-1',
    customerId: CLIENTE,
    clienteNome: 'Mercado do Bairro',
    clienteDocumento: '12345678000190',
    clienteCidade: 'Goiânia',
    clienteBairro: 'Setor Bueno',
    tipo: 'VENDA',
    situacao: 'AGUARDANDO_ANALISE',
    origem: 'MOBILE',
    vendedorId: 'vendedor-1',
    vendedorNome: 'Marcos Vendas',
    condicaoDePagamento: '28/35/42 dias',
    vencimentosEmDias: [28, 35, 42],
    prazoMedioEmDias: 35,
    formaDePagamento: 'Boleto',
    totalCentavos: 100_000,
    descontoCentavos: 0,
    itens: [],
    observacao: null,
    impressoPor: [],
    historico: [],
    observacoes: [],
    nota: null,
    enviadoEm: '2026-09-13T10:00:00.000Z',
    analisadoEm: null,
    analisadoPor: null,
    ...extra,
  }) as PedidoDeVenda;

export const cadastro = (extra: Partial<CadastroDoCliente> = {}): CadastroDoCliente =>
  ({
    id: CLIENTE,
    codigo: 'C-0042',
    type: 'PJ',
    name: 'Mercado do Bairro',
    legalName: 'Mercado do Bairro LTDA',
    taxId: '12345678000190',
    stateRegistration: null,
    phone: '(62) 3241-5566',
    whatsapp: null,
    email: null,
    address: {
      street: 'Rua T-37',
      number: '1450',
      complement: null,
      district: 'Setor Bueno',
      city: 'Goiânia',
      state: 'GO',
      postalCode: '74230020',
    },
    creditLimit: 1_000_000,
    financialStatus: 'REGULAR',
    updatedAt: null,
    updatedByName: null,
    ...extra,
  }) as CadastroDoCliente;

export const situacao = (extra: Partial<SituacaoDeCredito> = {}): SituacaoDeCredito => ({
  limiteCentavos: 1_000_000,
  emAbertoCentavos: 0,
  vencidoCentavos: 0,
  aVencerCentavos: 0,
  aprovadosNaoFaturadosCentavos: 0,
  comprometidoCentavos: 0,
  disponivelCentavos: 1_000_000,
  titulosVencidos: 0,
  diasDeAtrasoMaximo: 0,
  bloqueado: false,
  inadimplencia: { bloqueia: false, motivo: null, mensagem: null },
  cadastro: { existe: true, faltando: [] },
  titulosLiquidados: 10,
  possuiTitulos: true,
  calculadoEm: `${HOJE}T12:00:00.000Z`,
  ...extra,
});
