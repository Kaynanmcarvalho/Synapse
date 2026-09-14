import type {
  ClienteDaImpressao,
  Customer,
  EmpresaDaImpressao,
  ImpressaoDoPedido,
  ItemDaImpressao,
  PedidoDeVenda,
  PosSale,
} from '@synapse/types';

/** Monta o "PEDIDO DE VENDA (SEM VALOR FISCAL)" a partir do pedido do Ponto de
 *  Vendas ou da venda do PDV Balcão. Sem I/O: quem chama traz empresa e cliente. */

const TITULO = 'PEDIDO DE VENDA (SEM VALOR FISCAL)';

const SITUACAO_DO_PEDIDO: Readonly<Record<string, string>> = {
  AGUARDANDO_ANALISE: 'Aguardando análise de crédito',
  APROVADO: 'Aprovado',
  REPROVADO: 'Reprovado',
  FATURADO: 'Faturado',
  CANCELADO: 'Cancelado',
};

const pesoDaLinha = (quantidadeMilesimos: number, pesoUnitarioKg: number | null | undefined) =>
  Number((((pesoUnitarioKg ?? 0) * quantidadeMilesimos) / 1000).toFixed(3));

const juntar = (partes: readonly (string | null | undefined)[]) =>
  partes.filter((parte): parte is string => Boolean(parte?.trim())).join(', ');

const enderecoDoCliente = (endereco: Customer['address'] | undefined) =>
  juntar([
    endereco?.street && endereco.number
      ? `${endereco.street}, ${endereco.number}`
      : endereco?.street,
    endereco?.complement,
    endereco?.district,
    endereco?.city ? `${endereco.city} - ${endereco.state}` : null,
    endereco?.postalCode,
  ]);

export const clienteDaImpressao = (
  cliente: Customer | null,
  reserva: { readonly nome: string; readonly documento: string | null },
): ClienteDaImpressao => {
  if (!cliente) {
    return {
      codigo: null,
      nome: reserva.nome,
      fantasia: null,
      endereco: '',
      documento: reserva.documento,
      inscricaoEstadual: null,
      telefone: null,
    };
  }
  return {
    codigo: cliente.codigo ?? null,
    nome: cliente.legalName || cliente.name,
    fantasia: cliente.legalName && cliente.legalName !== cliente.name ? cliente.name : null,
    endereco: enderecoDoCliente(cliente.address),
    documento: cliente.taxId || null,
    inscricaoEstadual: cliente.stateRegistration ?? null,
    telefone: cliente.telefones?.principal ?? cliente.phone ?? null,
  };
};

const totalizar = (itens: readonly ItemDaImpressao[]) => ({
  totalBrutoCentavos: itens.reduce(
    (soma, item) => soma + Math.round((item.quantidade * item.valorUnitarioCentavos) / 1000),
    0,
  ),
  pesoTotalKg: Number(itens.reduce((soma, item) => soma + item.pesoKg, 0).toFixed(3)),
});

export const impressaoDoPedido = (
  pedido: PedidoDeVenda,
  empresa: EmpresaDaImpressao,
  cliente: Customer | null,
): ImpressaoDoPedido => {
  const itens: ItemDaImpressao[] = pedido.itens.map((item) => ({
    codigo: item.codigo ?? item.productId.slice(0, 8),
    descricao: item.descricao,
    quantidade: item.quantidade,
    unidade: item.unidade ?? 'UN',
    pesoKg: pesoDaLinha(item.quantidade, item.pesoUnitarioKg),
    valorUnitarioCentavos: item.precoUnitarioCentavos,
    descontoCentavos: item.descontoCentavos,
    valorTotalCentavos: item.totalCentavos,
    lote: item.lote ?? null,
  }));
  const { totalBrutoCentavos, pesoTotalKg } = totalizar(itens);
  return {
    titulo: TITULO,
    numero: pedido.numero,
    emitidoEm: pedido.enviadoEm,
    situacao: SITUACAO_DO_PEDIDO[pedido.situacao] ?? pedido.situacao,
    empresa,
    vendedor: pedido.vendedorCodigo
      ? `${pedido.vendedorCodigo} - ${pedido.vendedorNome}`
      : pedido.vendedorNome,
    assessor: null,
    cliente: clienteDaImpressao(cliente, {
      nome: pedido.clienteNome,
      documento: pedido.clienteDocumento,
    }),
    pagamentos: [{ descricao: pedido.formaDePagamento, valorCentavos: pedido.totalCentavos }],
    condicaoDePagamento: pedido.condicaoDePagamento,
    itens,
    totalBrutoCentavos,
    freteCentavos: pedido.freteCentavos ?? 0,
    acrescimosCentavos: pedido.acrescimoCentavos ?? 0,
    descontosCentavos: pedido.descontoCentavos,
    pesoTotalKg,
    totalLiquidoCentavos: pedido.totalCentavos,
    observacao: pedido.observacao,
  };
};

export const impressaoDaVenda = (
  venda: PosSale,
  empresa: EmpresaDaImpressao,
  cliente: Customer | null,
): ImpressaoDoPedido => {
  const itens: ItemDaImpressao[] = venda.items.map((item) => ({
    codigo: item.codigo ?? item.productId.slice(0, 8),
    descricao: item.description,
    quantidade: item.quantity,
    unidade: item.unidade ?? 'UN',
    pesoKg: pesoDaLinha(item.quantity, item.pesoUnitarioKg),
    valorUnitarioCentavos: item.unitPrice,
    descontoCentavos: item.discount,
    valorTotalCentavos: item.total,
    lote: item.lote ?? null,
  }));
  const { totalBrutoCentavos, pesoTotalKg } = totalizar(itens);
  return {
    titulo: TITULO,
    numero: venda.numero ?? 0,
    emitidoEm: venda.completedAt,
    situacao: venda.situacao === 'CANCELADA' ? 'Cancelada' : 'Concluída',
    empresa,
    vendedor: venda.vendedorCodigo
      ? `${venda.vendedorCodigo} - ${venda.vendedorNome ?? ''}`
      : (venda.vendedorNome ?? '-'),
    assessor: null,
    cliente: clienteDaImpressao(cliente, {
      nome: venda.clienteNome ?? 'CONSUMIDOR FINAL',
      documento: venda.customerTaxId,
    }),
    pagamentos: venda.payments.map((pagamento) => ({
      descricao: pagamento.formaNome
        ? `${pagamento.formaCodigo ? `${pagamento.formaCodigo} - ` : ''}${pagamento.formaNome}`
        : pagamento.method,
      valorCentavos: pagamento.amount,
    })),
    condicaoDePagamento: 'À vista',
    itens,
    totalBrutoCentavos,
    freteCentavos: 0,
    acrescimosCentavos: venda.surcharge,
    descontosCentavos: venda.discount,
    pesoTotalKg,
    totalLiquidoCentavos: venda.total,
    observacao: venda.mesaOuCartao ? `Mesa / cartão ${venda.mesaOuCartao}` : null,
  };
};
