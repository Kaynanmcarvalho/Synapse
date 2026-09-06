import type { BranchId, CustomerId, OrderId, TenantId, UserId } from '../common';

/** Os dois lados do fluxo de caixa (§24, §25).
 *
 *  Valores em centavos, como no resto do sistema: dinheiro em ponto flutuante
 *  erra na terceira parcela e ninguem percebe ate o cliente reclamar. */

export type TituloTipo = 'RECEBER' | 'PAGAR';

export type TituloStatus =
  'ABERTO' | 'PARCIAL' | 'QUITADO' | 'VENCIDO' | 'RENEGOCIADO' | 'CANCELADO';

export type FormaDeLiquidacao =
  | 'DINHEIRO'
  | 'PIX'
  | 'BOLETO'
  | 'CARTAO_DEBITO'
  | 'CARTAO_CREDITO'
  | 'TRANSFERENCIA'
  | 'COMPENSACAO';

/** Um recebimento ou pagamento lancado contra o titulo. Nunca e apagado: o
 *  saldo e a soma dos movimentos, e nao um numero editado no lugar. */
export interface Liquidacao {
  readonly id: string;
  readonly data: string;
  readonly valorCentavos: number;
  readonly forma: FormaDeLiquidacao;
  readonly observacao: string | null;
  /** Identificador no banco (nossoNumero, txid) quando veio de uma baixa
   *  automatica — e o que liga o extrato ao titulo sem adivinhar pelo valor. */
  readonly referenciaBancaria: string | null;
  readonly registradoPor: UserId;
  readonly registradoEm: string;
}

export interface Titulo {
  readonly id: string;
  readonly tenantId: TenantId;
  readonly branchId: BranchId;
  readonly tipo: TituloTipo;
  readonly descricao: string;
  /** Cliente no a receber; no a pagar fica nulo e quem responde e o fornecedor. */
  readonly customerId: CustomerId | null;
  readonly fornecedorId: string | null;
  readonly orderId: OrderId | null;
  readonly numeroParcela: number;
  readonly totalDeParcelas: number;
  readonly valorOriginalCentavos: number;
  readonly vencimento: string;
  readonly status: TituloStatus;
  readonly liquidacoes: readonly Liquidacao[];
  readonly centroDeCustoId: string | null;
  readonly categoriaId: string | null;
  /** Preenchido no titulo NOVO, apontando para o que foi renegociado. */
  readonly renegociadoDe: string | null;
  /** Preenchido no titulo ORIGINAL, apontando para os que o substituiram.
   *  A divida antiga nao some: ela fica com o rastro de para onde foi. */
  readonly renegociadoPara: readonly string[];
  readonly criadoEm: string;
  readonly criadoPor: UserId;
}

export interface CentroDeCusto {
  readonly id: string;
  readonly nome: string;
  readonly ativo: boolean;
}

export type NaturezaDaCategoria = 'RECEITA' | 'DESPESA';

export interface CategoriaFinanceira {
  readonly id: string;
  readonly nome: string;
  readonly natureza: NaturezaDaCategoria;
  readonly ativo: boolean;
}

export type Periodicidade = 'MENSAL' | 'SEMANAL' | 'QUINZENAL' | 'ANUAL';

/** Despesa que se repete (§25): aluguel, energia, contador. */
export interface Recorrencia {
  readonly id: string;
  readonly descricao: string;
  readonly fornecedorId: string | null;
  readonly valorCentavos: number;
  readonly periodicidade: Periodicidade;
  /** Dia do vencimento. Em mes que nao tem o dia 31, cai no ultimo dia do mes. */
  readonly diaDoVencimento: number;
  readonly inicio: string;
  readonly fim: string | null;
  readonly centroDeCustoId: string | null;
  readonly categoriaId: string | null;
  readonly ativa: boolean;
}

/** Faixas do dashboard do §24. */
export type FaixaDeVencimento = 'VENCIDOS' | 'HOJE' | 'ATE_7_DIAS' | 'ATE_30_DIAS' | 'DEPOIS';

export interface FaixaAgregada {
  readonly faixa: FaixaDeVencimento;
  readonly quantidade: number;
  readonly saldoCentavos: number;
}

export interface InadimplenciaDoCliente {
  readonly customerId: CustomerId;
  readonly titulosVencidos: number;
  readonly saldoVencidoCentavos: number;
  /** Dias de atraso do titulo mais antigo em aberto. */
  readonly diasDeAtrasoMaximo: number;
}

export interface DiaProjetado {
  readonly data: string;
  readonly entradasCentavos: number;
  readonly saidasCentavos: number;
  /** Saldo acumulado desde o inicial, dia a dia. */
  readonly saldoAcumuladoCentavos: number;
}
