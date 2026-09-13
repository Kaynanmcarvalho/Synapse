import type {
  BankAccountConfig,
  DetalheDaNota,
  DetalheDoBoleto,
  DetalheDoPedido,
  DetalheDoTitulo,
  EventoDoBoleto,
  EventoDoTitulo,
  LiquidacaoDoTitulo,
  PedidoDeVenda,
  Titulo,
  TituloDoDocumento,
} from '@synapse/types';
import type { Charge } from '../../finance/entities/boleto';
import {
  diasEntre,
  saldoCentavos,
  statusDe,
  totalLiquidadoCentavos,
} from '../../finance/entities/titulo';
import { identificacaoDoTitulo } from './analise-de-credito';
import { lancadoPorDe } from './historico';

/** Os documentos que a analise abre pela lupa — pedido, nota e titulo —, cada
 *  um com o que realmente existe gravado. O que o Synapse ainda nao guarda
 *  (XML, status da SEFAZ, arquivo CNAB) volta explicitamente como ausente. */

const somar = (valores: readonly number[]): number =>
  valores.reduce((total, valor) => total + valor, 0);

export const tituloDoDocumento = (
  titulo: Titulo,
  pedidosPorId: ReadonlyMap<string, PedidoDeVenda>,
  hoje: string,
): TituloDoDocumento => ({
  id: titulo.id,
  ...identificacaoDoTitulo(titulo, pedidosPorId),
  vencimento: titulo.vencimento.slice(0, 10),
  valorOriginalCentavos: titulo.valorOriginalCentavos,
  saldoCentavos: Math.max(0, saldoCentavos(titulo)),
  situacao: statusDe(titulo, hoje),
});

const titulosDoPedido = (
  pedido: PedidoDeVenda,
  titulos: readonly Titulo[],
  hoje: string,
): readonly TituloDoDocumento[] => {
  const porId = new Map([[pedido.id, pedido]]);
  return titulos
    .filter((titulo) => titulo.orderId === pedido.id)
    .sort((a, b) => a.numeroParcela - b.numeroParcela)
    .map((titulo) => tituloDoDocumento(titulo, porId, hoje));
};

export const detalheDoPedido = (
  pedido: PedidoDeVenda,
  titulos: readonly Titulo[],
  hoje: string,
): DetalheDoPedido => ({
  pedido,
  lancadoPor: lancadoPorDe(pedido),
  titulos: titulosDoPedido(pedido, titulos, hoje),
});

/** Bruto dos itens: quantidade (milesimos) x preco, antes do desconto. */
export const produtosDoPedido = (pedido: PedidoDeVenda): number =>
  somar(
    pedido.itens.map((item) => Math.round((item.quantidade * item.precoUnitarioCentavos) / 1000)),
  );

export const detalheDaNota = (
  pedido: PedidoDeVenda,
  titulos: readonly Titulo[],
  hoje: string,
): DetalheDaNota | null => {
  if (!pedido.nota) return null;
  return {
    pedidoId: pedido.id,
    pedidoNumero: pedido.numero,
    pedidoSituacao: pedido.situacao,
    numero: pedido.nota.numero,
    serie: pedido.nota.serie,
    chaveDeAcesso: pedido.nota.chaveDeAcesso,
    emitidaEm: pedido.nota.emitidaEm,
    cliente: {
      id: pedido.customerId,
      nome: pedido.clienteNome,
      documento: pedido.clienteDocumento,
      cidade: pedido.clienteCidade,
      bairro: pedido.clienteBairro,
    },
    vendedorNome: pedido.vendedorNome,
    produtosCentavos: produtosDoPedido(pedido),
    descontoCentavos: pedido.descontoCentavos,
    freteCentavos: pedido.freteCentavos ?? null,
    totalCentavos: pedido.totalCentavos,
    titulos: titulosDoPedido(pedido, titulos, hoje),
    eventos: (pedido.historico ?? []).filter((item) => item.etapa === 'FATURAMENTO'),
    situacaoFiscal: null,
    xmlDisponivel: false,
    danfeDisponivel: false,
  };
};

const liquidacoesDoTitulo = (
  titulo: Titulo,
  nomes: ReadonlyMap<string, string>,
): readonly LiquidacaoDoTitulo[] =>
  [...titulo.liquidacoes]
    .sort((a, b) => a.data.localeCompare(b.data) || a.registradoEm.localeCompare(b.registradoEm))
    .map((liquidacao) => ({
      id: liquidacao.id,
      data: liquidacao.data.slice(0, 10),
      valorCentavos: liquidacao.valorCentavos,
      forma: liquidacao.forma,
      referenciaBancaria: liquidacao.referenciaBancaria,
      observacao: liquidacao.observacao,
      registradoPor: liquidacao.registradoPor,
      registradoPorNome: nomes.get(liquidacao.registradoPor) ?? null,
      registradoEm: liquidacao.registradoEm,
      diasEmRelacaoAoVencimento: diasEntre(titulo.vencimento, liquidacao.data),
    }));

/** Dia em que o saldo zerou: a liquidacao que completou o valor. */
export const dataDaQuitacao = (titulo: Titulo): string | null => {
  let pago = 0;
  const ordenadas = [...titulo.liquidacoes].sort((a, b) => a.data.localeCompare(b.data));
  for (const liquidacao of ordenadas) {
    pago += liquidacao.valorCentavos;
    if (pago >= titulo.valorOriginalCentavos) return liquidacao.data.slice(0, 10);
  }
  return null;
};

/** Linha do tempo com o que tem data gravada. Cancelamento e renegociacao nao
 *  guardam quando aconteceram: aparecem na situacao do titulo, e nao aqui com
 *  uma data inventada. */
const eventosDoTitulo = (titulo: Titulo, boleto: Charge | null): readonly EventoDoTitulo[] => {
  const eventos: EventoDoTitulo[] = [
    { em: titulo.criadoEm, tipo: 'CRIADO', descricao: 'Título gerado', detalhe: titulo.descricao },
  ];
  if (boleto) {
    eventos.push({
      em: boleto.createdAt,
      tipo: 'BOLETO_EMITIDO',
      descricao: 'Boleto emitido',
      detalhe: boleto.bank?.nossoNumero ? `Nosso número ${boleto.bank.nossoNumero}` : null,
    });
  }
  let acumulado = 0;
  for (const liquidacao of [...titulo.liquidacoes].sort((a, b) => a.data.localeCompare(b.data))) {
    acumulado += liquidacao.valorCentavos;
    eventos.push({
      em: liquidacao.registradoEm,
      tipo: 'LIQUIDACAO',
      descricao:
        acumulado >= titulo.valorOriginalCentavos
          ? 'Liquidação que quitou o título'
          : 'Recebimento parcial',
      detalhe: liquidacao.referenciaBancaria ? `Referência ${liquidacao.referenciaBancaria}` : null,
    });
  }
  return eventos.sort((a, b) => a.em.localeCompare(b.em));
};

export interface EventoGravadoDoBoleto {
  readonly eventId: string;
  readonly amount: number;
  readonly userId: string;
  readonly note: string;
  readonly occurredAt: string;
}

const eventosDoBoleto = (
  boleto: Charge,
  gravados: readonly EventoGravadoDoBoleto[],
): readonly EventoDoBoleto[] => {
  const eventos: EventoDoBoleto[] = [
    {
      em: boleto.createdAt,
      descricao: 'Boleto gerado no Synapse',
      codigo: null,
      detalhe: `Parcela ${boleto.installment}`,
    },
  ];
  if (boleto.bank) {
    eventos.push({
      em: boleto.createdAt,
      descricao: 'Registro enviado ao banco pela API',
      codigo: boleto.bank.status,
      detalhe: boleto.bank.nossoNumero ? `Nosso número ${boleto.bank.nossoNumero}` : null,
    });
  }
  for (const gravado of gravados) {
    eventos.push({
      em: gravado.occurredAt,
      descricao: 'Liquidação registrada',
      codigo: gravado.eventId,
      detalhe: gravado.note || null,
    });
  }
  return eventos.sort((a, b) => a.em.localeCompare(b.em));
};

const dadosDaConta = (conta: BankAccountConfig | null) => ({
  bancoId: conta?.bankId ?? null,
  contaApelido: conta?.apelido ?? null,
  carteira: conta?.sicredi?.carteira ?? conta?.itau?.carteira ?? null,
});

/** O que o banco devolveu no registro. Boleto ainda nao registrado nao tem. */
const dadosDoBanco = (boleto: Charge) => {
  const banco = boleto.bank;
  return {
    nossoNumero: banco?.nossoNumero ?? null,
    numeroDoDocumento: banco?.referencia ?? boleto.id,
    linhaDigitavel: banco?.linhaDigitavel ?? null,
    situacaoNoBanco: banco?.status ?? null,
    pdfDisponivel: Boolean(banco?.pdfUrl),
  };
};

/** Instrucoes de cobranca combinadas na emissao — nao o que foi cobrado. */
const instrucoes = (boleto: Charge) => ({
  multaPercentual: boleto.input?.finePercent ?? null,
  jurosMensalPercentual: boleto.input?.interestPercent ?? null,
  descontoCentavos: boleto.input?.discountCentavos ?? null,
});

export const detalheDoBoleto = (
  boleto: Charge,
  conta: BankAccountConfig | null,
  gravados: readonly EventoGravadoDoBoleto[],
): DetalheDoBoleto => ({
  id: boleto.id,
  ...dadosDaConta(conta),
  ...dadosDoBanco(boleto),
  ...instrucoes(boleto),
  valorCentavos: boleto.amountCentavos,
  emitidoEm: boleto.createdAt,
  vencimento: boleto.dueDate,
  situacao: boleto.status,
  integracao: 'API',
  eventos: eventosDoBoleto(boleto, gravados),
});

export interface EntradaDoTitulo {
  readonly titulo: Titulo;
  readonly pedido: PedidoDeVenda | null;
  readonly boleto: Charge | null;
  readonly conta: BankAccountConfig | null;
  readonly eventosDoBoleto: readonly EventoGravadoDoBoleto[];
  readonly nomes: ReadonlyMap<string, string>;
  readonly hoje: string;
}

export const detalheDoTitulo = (entrada: EntradaDoTitulo): DetalheDoTitulo => {
  const { titulo, pedido, boleto, hoje } = entrada;
  const pedidosPorId = new Map(pedido ? [[pedido.id, pedido]] : []);
  const situacao = statusDe(titulo, hoje);
  const quitadoEm = situacao === 'QUITADO' ? dataDaQuitacao(titulo) : null;
  const encerrado =
    situacao === 'QUITADO' || situacao === 'CANCELADO' || situacao === 'RENEGOCIADO';
  return {
    id: titulo.id,
    descricao: titulo.descricao,
    ...identificacaoDoTitulo(titulo, pedidosPorId),
    pedidoId: titulo.orderId,
    pedidoNumero: pedido?.numero ?? null,
    pedidoSituacao: pedido?.situacao ?? null,
    nota: pedido?.nota ?? null,
    emitidoEm: titulo.criadoEm,
    vencimento: titulo.vencimento.slice(0, 10),
    valorOriginalCentavos: titulo.valorOriginalCentavos,
    recebidoCentavos: totalLiquidadoCentavos(titulo),
    saldoCentavos: Math.max(0, saldoCentavos(titulo)),
    situacao,
    diasParaVencer: encerrado ? null : diasEntre(hoje, titulo.vencimento),
    quitadoEm,
    formaDeCobranca: boleto ? 'BOLETO' : null,
    liquidacoes: liquidacoesDoTitulo(titulo, entrada.nomes),
    eventos: eventosDoTitulo(titulo, boleto),
    boleto: boleto ? detalheDoBoleto(boleto, entrada.conta, entrada.eventosDoBoleto) : null,
    renegociadoDe: titulo.renegociadoDe,
    renegociadoPara: titulo.renegociadoPara,
  };
};
