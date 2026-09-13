import type { CustomerId, TenantId, UserId } from '../common';

/** A ficha do cliente como o balcão preenche: os campos das abas do cadastro.
 *
 *  Um cliente, um documento. A análise de crédito, o PDV, a busca e a carteira
 *  do vendedor leem daqui — não existe segunda cópia do cadastro. Os dados de
 *  destinatário (IE, CRT, e-mail da NF-e, IBGE) ficam guardados; a emissão de
 *  NF-e ainda não os puxa daqui (docs/CLIENTES.md, lacunas).
 *
 *  O que tem efeito no sistema está marcado campo a campo. O resto é registro:
 *  fica guardado e aparece na ficha, sem inventar regra que o Synapse não tem. */

/** Indicador da inscrição estadual do destinatário (indIEDest da NF-e). */
export type IndicadorDeIe = 'CONTRIBUINTE' | 'ISENTO' | 'NAO_CONTRIBUINTE';

/** Código de regime tributário (CRT da NF-e). */
export type RegimeTributario = 'SIMPLES_NACIONAL' | 'SIMPLES_EXCESSO' | 'REGIME_NORMAL' | 'MEI';

/** O que a venda pode fazer com este cliente.
 *
 *  `SEM_RESTRICAO`: qualquer condição combinada.
 *  `SOMENTE_A_VISTA`: pedido a prazo fere a política de crédito e só passa com
 *  aprovação excepcional — a mesma porta das outras violações. */
export type AutorizacaoDePagamento = 'SEM_RESTRICAO' | 'SOMENTE_A_VISTA';

/** Contato comercial do cliente (aba Pessoa Jurídica). */
export interface ContatoDoCliente {
  readonly nome: string;
  readonly celular: string | null;
  /** Quem faz a compra, quando não é a mesma pessoa do contato. */
  readonly comprador: string | null;
  readonly foneDoComprador: string | null;
}

export interface SocioDoCliente {
  readonly nome: string;
  readonly cpf: string | null;
}

/** Referência comercial: quem já vende para este cliente e o que respondeu.
 *  Cada uma guarda quem anotou e quando — é informação de terceiro. */
export interface ReferenciaComercial {
  readonly id: string;
  readonly empresa: string;
  readonly contato: string | null;
  readonly telefone: string | null;
  readonly observacao: string | null;
  readonly registradaEm: string;
  readonly registradaPorNome: string;
}

/** Dados de pessoa jurídica — vazio para pessoa física. */
export interface DadosDePessoaJuridica {
  readonly contato: ContatoDoCliente | null;
  readonly socios: readonly SocioDoCliente[];
  readonly contabilista: string | null;
  readonly dataDeAbertura: string | null;
  readonly ramoDeAtividade: string | null;
  /** Segmento comercial, em texto livre com sugestão pelos já usados. */
  readonly segmento: string | null;
  readonly substitutoTributario: boolean;
  readonly revendedor: boolean;
  readonly orgaoPublico: boolean;
  readonly inscricaoSuframa: string | null;
  /** Regime especial de Goiás (TARE). Guardado como o fisco pede. */
  readonly tare: { readonly numero: string; readonly fomentarOuProduzir: boolean } | null;
}

/** Como este cliente costuma comprar.
 *
 *  `diasParaBloqueio` e `autorizacaoDePagamento` são lidos pela análise de
 *  crédito. Condição, forma e desconto máximo ficam registrados: o lançamento
 *  de pedido ainda não os aplica, e a tela diz isso ao lado de cada campo. */
export interface ControleDeVendas {
  /** Condição padrão sugerida no pedido: "28/35/42". */
  readonly condicaoDePagamentoPadrao: string | null;
  readonly formaDePagamentoPadrao: string | null;
  /** Desconto que o vendedor pode dar sozinho, em pontos percentuais. */
  readonly descontoMaximoPercentual: number | null;
  /** Dias de atraso tolerados antes de bloquear. Sem valor, vale a política
   *  geral do financeiro. É lido pela análise de crédito. */
  readonly diasParaBloqueio: number | null;
  readonly autorizacaoDePagamento: AutorizacaoDePagamento;
}

/** Agrupamentos comerciais. Texto livre, com sugestão pelos valores já usados —
 *  o Synapse ainda não tem cadastro próprio de grupo, sub-grupo e praça. */
export interface ClassificacaoComercial {
  readonly grupo: string | null;
  readonly subGrupo: string | null;
  readonly pracaOuRegiao: string | null;
}

/** Telefones da ficha. `whatsapp` diz em qual deles o cliente responde. */
export interface TelefonesDoCliente {
  readonly principal: string;
  readonly secundario: string | null;
  readonly celular: string | null;
  readonly whatsapp: string | null;
}

/** Os campos que o cadastro acrescenta ao `Customer`. Todos opcionais: cliente
 *  gravado antes desta tela continua válido, e a ficha mostra "não informado". */
export interface FichaDoCliente {
  /** Código sequencial por tenant, como o balcão chama o cliente: "C-0042". */
  readonly codigo?: string | null;
  readonly emailNfe?: string | null;
  readonly telefones?: TelefonesDoCliente;
  readonly indicadorDeIe?: IndicadorDeIe;
  readonly regimeTributario?: RegimeTributario | null;
  readonly classificacao?: ClassificacaoComercial;
  readonly vendedorSecundarioId?: UserId | null;
  readonly pessoaJuridica?: DadosDePessoaJuridica | null;
  readonly referenciasComerciais?: readonly ReferenciaComercial[];
  readonly controleDeVendas?: ControleDeVendas;
  readonly observacao?: string | null;
  readonly observacaoInterna?: string | null;
  /** Código IBGE do município, exigido pela NF-e. */
  readonly codigoIbgeDaCidade?: string | null;
  readonly pais?: string;
}

/** Cliente na lista da tela de cadastro: o suficiente para achar e decidir. */
export interface ClienteNaLista {
  readonly id: CustomerId;
  readonly tenantId: TenantId;
  readonly codigo: string | null;
  readonly nome: string;
  readonly razaoSocial: string | null;
  readonly documento: string;
  readonly tipo: 'PF' | 'PJ' | 'RURAL_PRODUCER';
  readonly cidade: string;
  readonly uf: string;
  readonly telefone: string;
  readonly limiteCentavos: number;
  readonly situacao: 'REGULAR' | 'OVERDUE' | 'BLOCKED';
  readonly ativo: boolean;
  readonly grupo: string | null;
  readonly vendedorNome: string | null;
  readonly atualizadoEm: string | null;
}

/** Resposta da lista, com o cursor da próxima página. */
export interface PaginaDeClientes {
  readonly itens: readonly ClienteNaLista[];
  readonly proximoCursor: string | null;
  readonly total: number | null;
}

/** Valores já usados em outros clientes, para sugerir sem inventar cadastro. */
export interface SugestoesDoCadastro {
  readonly grupos: readonly string[];
  readonly subGrupos: readonly string[];
  readonly pracas: readonly string[];
  readonly segmentos: readonly string[];
  readonly ramosDeAtividade: readonly string[];
}
