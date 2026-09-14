import type { ReferenciaDeTabela } from './tabelas';

/** A ficha completa do fornecedor, na ordem das abas do Syndata: Principal,
 *  Documentos e Escrituração Digital. Fica dentro do `Supplier`, com todos os
 *  campos opcionais: fornecedor gravado antes desta tela continua valendo. */

export type TipoDePessoaDoFornecedor = 'FISICA' | 'JURIDICA' | 'ESTRANGEIRA';

export type IndicadorDeInscricaoEstadual = 'CONTRIBUINTE' | 'ISENTO' | 'NAO_CONTRIBUINTE';

export type RegimeTributarioDoFornecedor =
  'SIMPLES_NACIONAL' | 'SIMPLES_EXCESSO' | 'REGIME_NORMAL' | 'MEI';

export interface EnderecoDoCadastro {
  /** Só dígitos. */
  readonly cep: string;
  readonly logradouro: string;
  readonly numero: string;
  readonly complemento: string | null;
  readonly bairro: string;
  /** Código IBGE do município, 7 dígitos. É o que a NF-e e o SPED leem. */
  readonly cidadeCodigoIbge: string | null;
  readonly cidade: string;
  readonly uf: string;
  /** Código BACEN do país; 1058 = Brasil. */
  readonly paisCodigo: string;
  readonly paisNome: string;
}

export interface TelefoneDoCadastro {
  /** Só dígitos, com DDD. */
  readonly numero: string;
  readonly whatsapp: boolean;
}

export interface RepresentanteDoFornecedor {
  readonly nome: string | null;
  readonly telefone: string | null;
  readonly celular: string | null;
}

export type AtividadeDoFornecedor =
  | 'INDUSTRIA'
  | 'ATACADO'
  | 'VAREJO'
  | 'PRODUTOR_RURAL'
  | 'PRESTADOR_DE_SERVICO'
  | 'IMPORTADOR'
  | 'OUTROS';

/** Aba Escrituração Digital: como o fornecedor entra no SPED e na contabilidade. */
export interface EscrituracaoDoFornecedor {
  /** COD_PART do registro 0150. Vazio usa o código do fornecedor. */
  readonly codigoDoParticipante: string | null;
  readonly contaContabil: string | null;
  readonly atividade: AtividadeDoFornecedor;
  readonly inscricaoSuframa: string | null;
  /** NIT/PIS do autônomo (pessoa física prestadora de serviço). */
  readonly nitPis: string | null;
  /** As entradas deste fornecedor geram crédito de PIS/COFINS. */
  readonly geraCreditoPisCofins: boolean;
  /** Produtor rural pessoa física: a entrada retém a contribuição previdenciária. */
  readonly retemFunrural: boolean;
  readonly retencoes: {
    readonly irrf: boolean;
    readonly pis: boolean;
    readonly cofins: boolean;
    readonly csll: boolean;
    readonly inss: boolean;
    readonly iss: boolean;
  };
}

export interface FichaDoFornecedor {
  /** Código sequencial por tenant, o número que o balcão fala. */
  readonly codigo?: number | null;
  readonly tipoDePessoa?: TipoDePessoaDoFornecedor;
  readonly endereco?: EnderecoDoCadastro;
  readonly praca?: ReferenciaDeTabela;
  readonly grupo?: ReferenciaDeTabela;
  readonly subGrupo?: ReferenciaDeTabela;
  readonly regimeTributario?: RegimeTributarioDoFornecedor | null;
  readonly observacao?: string | null;
  readonly telefone1?: TelefoneDoCadastro | null;
  readonly telefone2?: TelefoneDoCadastro | null;
  readonly fax?: string | null;
  readonly site?: string | null;
  readonly email?: string | null;
  readonly emailNfe?: string | null;
  readonly indicadorIe?: IndicadorDeInscricaoEstadual;
  readonly inscricaoMunicipal?: string | null;
  readonly representante?: RepresentanteDoFornecedor;
  readonly escrituracao?: EscrituracaoDoFornecedor;
}

/** A linha da lista de fornecedores. */
export interface FornecedorNaLista {
  readonly id: string;
  readonly codigo: number | null;
  readonly razaoSocial: string;
  readonly nomeFantasia: string;
  readonly documento: string;
  readonly tipoDePessoa: TipoDePessoaDoFornecedor;
  readonly cidade: string;
  readonly uf: string;
  readonly telefone: string | null;
  readonly grupo: string | null;
  readonly ativo: boolean;
  readonly atualizadoEm: string | null;
}

export interface PaginaDeFornecedores {
  readonly itens: readonly FornecedorNaLista[];
  readonly proximoCursor: string | null;
}

/** O que a "(F4) Consulta" do CNPJ traz para preencher a ficha. */
export interface ConsultaDeCnpj {
  readonly cnpj: string;
  readonly razaoSocial: string;
  readonly nomeFantasia: string;
  readonly situacao: string;
  readonly abertura: string | null;
  readonly atividadePrincipal: string | null;
  readonly endereco: EnderecoDoCadastro;
  readonly telefone: string | null;
  readonly email: string | null;
  readonly simplesNacional: boolean | null;
  readonly fonte: string;
}

/** Aba Documentos: o que o sistema já registrou com este fornecedor. */
export interface DocumentosDoFornecedor {
  readonly pedidosDeCompra: readonly {
    readonly id: string;
    readonly numero: string;
    readonly situacao: string;
    readonly totalCentavos: number;
    readonly criadoEm: string;
  }[];
  readonly titulosEmAberto: readonly LinhaDeTituloDoFornecedor[];
  readonly titulosPagos: readonly LinhaDeTituloDoFornecedor[];
}

export interface LinhaDeTituloDoFornecedor {
  readonly id: string;
  readonly descricao: string;
  readonly vencimento: string;
  readonly valorCentavos: number;
  readonly saldoCentavos: number;
  readonly situacao: string;
}
