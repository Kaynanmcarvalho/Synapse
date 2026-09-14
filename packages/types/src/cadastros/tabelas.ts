/** Tabelas auxiliares com codigo, como no Syndata: o "1 - GERAL" dos campos com
 *  lupa. Cada tenant tem as suas; o codigo e sequencial por tabela e nunca muda. */

export const TIPOS_DE_TABELA = [
  'cargos',
  'departamentos',
  'pracas',
  'grupos-de-fornecedor',
  'subgrupos-de-fornecedor',
  'formas-de-pagamento',
] as const;

export type TipoDeTabela = (typeof TIPOS_DE_TABELA)[number];

export const ROTULO_DA_TABELA: Readonly<Record<TipoDeTabela, string>> = {
  cargos: 'Cargos de funcionário',
  departamentos: 'Departamentos',
  pracas: 'Praças e regiões',
  'grupos-de-fornecedor': 'Grupos de fornecedores',
  'subgrupos-de-fornecedor': 'Sub-grupos de fornecedores',
  'formas-de-pagamento': 'Formas de pagamento',
};

/** Como a forma de pagamento se comporta no caixa e no pedido. */
export const MEIOS_DE_PAGAMENTO = [
  'DINHEIRO',
  'PIX',
  'CARTAO_DEBITO',
  'CARTAO_CREDITO',
  'BOLETO',
  'A_PRAZO',
  'CHEQUE',
  'BONIFICACAO',
  'OUTROS',
] as const;

export type MeioDePagamento = (typeof MEIOS_DE_PAGAMENTO)[number];

export const ROTULO_DO_MEIO: Readonly<Record<MeioDePagamento, string>> = {
  DINHEIRO: 'Dinheiro',
  PIX: 'PIX',
  CARTAO_DEBITO: 'Cartão de débito',
  CARTAO_CREDITO: 'Cartão de crédito',
  BOLETO: 'Boleto',
  A_PRAZO: 'A prazo (carteira)',
  CHEQUE: 'Cheque',
  BONIFICACAO: 'Bonificação',
  OUTROS: 'Outros',
};

export interface ItemDeTabela {
  readonly tipo: TipoDeTabela;
  readonly codigo: number;
  readonly nome: string;
  readonly ativo: boolean;
  /** Só em formas de pagamento. */
  readonly meio?: MeioDePagamento;
  readonly criadoEm: string;
  readonly atualizadoEm: string;
  readonly criadoPor: string | null;
  readonly atualizadoPor: string | null;
}

/** O que o cadastro guarda do item escolhido: o código e o nome daquele
 *  momento — renomear a praça depois não reescreve fichas antigas. */
export interface ReferenciaDeTabela {
  readonly codigo: number;
  readonly nome: string;
}

export const REFERENCIA_GERAL: ReferenciaDeTabela = { codigo: 1, nome: 'GERAL' };
