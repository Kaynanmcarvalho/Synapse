import type {
  CadastroDoCliente,
  CadastroResumido,
  CustomerId,
  ParametrosDaAnalise,
  PedidoDeVenda,
  SituacaoDeCredito,
  Titulo,
} from '@synapse/types';
import { exposicaoDoPedido } from '@synapse/validation';
import { avaliarCredito } from '../../finance/entities/credito-do-cliente';
import {
  contaNoSaldo,
  diasDeAtraso,
  estaQuitado,
  saldoCentavos,
} from '../../finance/entities/titulo';

/** O retrato de credito do cliente, montado dos dados que existem de verdade:
 *  titulos a receber, pedidos aprovados que ainda nao viraram titulo e o
 *  cadastro. Puro — quem le do banco e o servico. */

const somar = (valores: readonly number[]): number =>
  valores.reduce((total, valor) => total + valor, 0);

export const titulosAReceberDoCliente = (
  titulos: readonly Titulo[],
  customerId: string,
): readonly Titulo[] =>
  titulos.filter((titulo) => titulo.tipo === 'RECEBER' && titulo.customerId === customerId);

/** Quitado de verdade: o saldo zerou por pagamento, nao por cancelamento. */
export const foiLiquidado = (titulo: Titulo): boolean =>
  titulo.status !== 'CANCELADO' &&
  titulo.status !== 'RENEGOCIADO' &&
  titulo.liquidacoes.length > 0 &&
  estaQuitado(titulo);

/** Pedido aprovado que ainda nao foi faturado: o credito ja foi dado, mas o
 *  titulo ainda nao existe. Sem contar isso, dois pedidos aprovados na mesma
 *  manha pareceriam caber no mesmo limite.
 *
 *  Pedido em analise nao entra: ele ainda nao compromete nada. E quando o
 *  titulo do pedido nasce (titulo com `orderId` e nao cancelado), o valor passa
 *  a contar pelo saldo do titulo e o pedido sai daqui — mesmo que a situacao do
 *  pedido ainda nao tenha virado FATURADO. Sem isso, 5.000 aprovados virariam
 *  10.000 comprometidos no intervalo entre gerar o titulo e fechar o pedido. */
export const aprovadoNaoFaturado = (
  pedido: PedidoDeVenda,
  titulos: readonly Titulo[] = [],
): boolean =>
  pedido.situacao === 'APROVADO' &&
  pedido.nota === null &&
  !titulos.some((titulo) => titulo.orderId === pedido.id && titulo.status !== 'CANCELADO');

/** O que falta no cadastro para faturar sem voltar ao cliente. */
export const camposFaltando = (cadastro: CadastroDoCliente): readonly string[] => {
  const faltando: string[] = [];
  const documento = cadastro.taxId.replace(/\D/g, '');
  if (documento.length !== 11 && documento.length !== 14) faltando.push('CPF/CNPJ');
  if (!cadastro.phone.trim() && !(cadastro.whatsapp ?? '').trim()) faltando.push('telefone');
  if (!cadastro.address.street.trim()) faltando.push('logradouro');
  if (!cadastro.address.city.trim()) faltando.push('cidade');
  if (!cadastro.address.state.trim()) faltando.push('UF');
  if (cadastro.address.postalCode.replace(/\D/g, '').length !== 8) faltando.push('CEP');
  return faltando;
};

export const resumoDoCadastro = (cadastro: CadastroDoCliente | null): CadastroResumido =>
  cadastro ? { existe: true, faltando: camposFaltando(cadastro) } : { existe: false, faltando: [] };

export interface EntradaDaSituacao {
  readonly customerId: string;
  readonly titulos: readonly Titulo[];
  readonly cadastro: CadastroDoCliente | null;
  /** Pedidos do cliente na situacao APROVADO. */
  readonly aprovados: readonly PedidoDeVenda[];
  readonly parametros: ParametrosDaAnalise;
  readonly hoje: string;
  readonly agora: string;
}

export const situacaoDeCredito = (entrada: EntradaDaSituacao): SituacaoDeCredito => {
  const { customerId, cadastro, parametros, hoje } = entrada;
  const doCliente = titulosAReceberDoCliente(entrada.titulos, customerId);
  const abertos = doCliente.filter(contaNoSaldo);
  const vencidos = abertos.filter((titulo) => diasDeAtraso(titulo, hoje) > 0);
  const emAbertoCentavos = somar(abertos.map(saldoCentavos));
  const vencidoCentavos = somar(vencidos.map(saldoCentavos));
  const aprovadosNaoFaturadosCentavos = somar(
    entrada.aprovados
      .filter(
        (pedido) => pedido.customerId === customerId && aprovadoNaoFaturado(pedido, doCliente),
      )
      .map((pedido) => exposicaoDoPedido(pedido).exposicaoCentavos),
  );
  const comprometidoCentavos = emAbertoCentavos + aprovadosNaoFaturadosCentavos;
  const limiteCentavos = cadastro ? Math.max(0, cadastro.creditLimit ?? 0) : null;

  // A regra de inadimplencia e a do financeiro, com a tolerancia da analise.
  const avaliacao = avaliarCredito(
    customerId as CustomerId,
    doCliente,
    {
      bloquearInadimplente: true,
      diasDeToleranciaAtraso: parametros.toleranciaDeAtrasoDias,
      limiteDeSaldoVencidoCentavos: 0,
    },
    hoje,
  );

  return {
    limiteCentavos,
    emAbertoCentavos,
    vencidoCentavos,
    aVencerCentavos: emAbertoCentavos - vencidoCentavos,
    aprovadosNaoFaturadosCentavos,
    comprometidoCentavos,
    disponivelCentavos: limiteCentavos === null ? null : limiteCentavos - comprometidoCentavos,
    titulosVencidos: vencidos.length,
    diasDeAtrasoMaximo: vencidos.reduce(
      (maior, titulo) => Math.max(maior, diasDeAtraso(titulo, hoje)),
      0,
    ),
    bloqueado: cadastro?.financialStatus === 'BLOCKED',
    inadimplencia: avaliacao.liberado
      ? { bloqueia: false, motivo: null, mensagem: null }
      : { bloqueia: true, motivo: avaliacao.motivo, mensagem: avaliacao.mensagem },
    cadastro: resumoDoCadastro(cadastro),
    titulosLiquidados: doCliente.filter(foiLiquidado).length,
    possuiTitulos: doCliente.some((titulo) => titulo.status !== 'CANCELADO'),
    calculadoEm: entrada.agora,
  };
};
