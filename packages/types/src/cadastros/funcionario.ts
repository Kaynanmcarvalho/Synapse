import type { AuditStamp, TenantId } from '../common';
import type { ReferenciaDeTabela } from './tabelas';

/** Cadastro de funcionários do Syndata: Principal, Outras Informações, Comissão,
 *  Documentos e Relatórios. O funcionário marcado como vendedor é quem aparece no
 *  campo "Vendedor" do Ponto de Vendas e do PDV, e é dono da comissão. */

export type SexoDoFuncionario = 'MASCULINO' | 'FEMININO' | 'NAO_INFORMADO';

export type EstadoCivil =
  'SOLTEIRO' | 'CASADO' | 'UNIAO_ESTAVEL' | 'SEPARADO' | 'DIVORCIADO' | 'VIUVO' | 'NAO_INFORMADO';

export interface EnderecoDoFuncionario {
  readonly cep: string;
  /** Logradouro com número e complemento, como o Syndata guarda. */
  readonly logradouro: string;
  readonly bairro: string;
  readonly cidadeCodigoIbge: string | null;
  readonly cidade: string;
  readonly uf: string;
}

export interface OutrasInformacoesDoFuncionario {
  readonly nascimento: string | null;
  readonly sexo: SexoDoFuncionario;
  readonly tipoSanguineo: string | null;
  readonly escolaridade: string | null;
  readonly email: string | null;
  readonly pai: string | null;
  readonly mae: string | null;
  readonly estadoCivil: EstadoCivil;
  readonly conjuge: string | null;
  readonly observacoes: string | null;
}

export interface DocumentosPessoaisDoFuncionario {
  readonly identidade: string | null;
  /** Só dígitos. Único por empresa. */
  readonly cpf: string | null;
  readonly pis: string | null;
  readonly tituloDeEleitor: string | null;
  readonly ctps: string | null;
  readonly serieDaCtps: string | null;
  readonly cnh: string | null;
  readonly categoriaDaCnh: string | null;
}

export type BaseDaComissao = 'FATURAMENTO' | 'RECEBIMENTO';

export interface ComissaoDoFuncionario {
  /** Aparece no campo Vendedor do Ponto de Vendas e do PDV. */
  readonly vendedor: boolean;
  readonly percentualAVista: number;
  readonly percentualAPrazo: number;
  readonly base: BaseDaComissao;
  /** Maior desconto que o vendedor dá sozinho no balcão, em percentual. */
  readonly descontoMaximoPercentual: number;
  readonly metaMensalCentavos: number;
}

/** O usuário do sistema ligado a este funcionário (Manutenção de Usuário). */
export interface UsuarioDoFuncionario {
  readonly uid: string;
  readonly email: string;
  readonly nome: string;
}

export interface Funcionario extends AuditStamp {
  readonly id: string;
  readonly tenantId: TenantId;
  /** Código sequencial por empresa: o "15" de "15 - RENIER PANTOJA". */
  readonly codigo: number;
  readonly matricula: string | null;
  readonly nome: string;
  readonly bloqueado: boolean;
  readonly endereco: EnderecoDoFuncionario;
  readonly telefone: string | null;
  readonly celular: string | null;
  readonly cargo: ReferenciaDeTabela;
  readonly praca: ReferenciaDeTabela;
  readonly departamento: ReferenciaDeTabela;
  /** "08:00:00". */
  readonly horaDeEntrada: string | null;
  readonly horaDeSaida: string | null;
  /** "2026-09-14". */
  readonly admissao: string;
  readonly demissao: string | null;
  readonly salarioCentavos: number;
  readonly outrasInformacoes: OutrasInformacoesDoFuncionario;
  readonly documentos: DocumentosPessoaisDoFuncionario;
  readonly comissao: ComissaoDoFuncionario;
  readonly usuario: UsuarioDoFuncionario | null;
  /** A foto mora em documento próprio; a ficha só diz se existe. */
  readonly fotoAtualizadaEm: string | null;
}

export interface FuncionarioNaLista {
  readonly id: string;
  readonly codigo: number;
  readonly nome: string;
  readonly matricula: string | null;
  readonly cargo: string;
  readonly departamento: string;
  readonly telefone: string | null;
  readonly vendedor: boolean;
  readonly bloqueado: boolean;
  readonly demitido: boolean;
  readonly usuarioEmail: string | null;
  readonly temFoto: boolean;
}

export interface PaginaDeFuncionarios {
  readonly itens: readonly FuncionarioNaLista[];
  readonly proximoCursor: string | null;
}

/** Aba Documentos: pedidos em que o funcionário é o vendedor. */
export interface PedidoDoVendedor {
  readonly id: string;
  readonly numero: number;
  readonly clienteNome: string;
  readonly situacao: string;
  readonly tipo: string;
  readonly totalCentavos: number;
  readonly enviadoEm: string;
}

/** Aba Relatórios: o mês do vendedor, calculado dos pedidos gravados. */
export interface ResumoDoVendedor {
  readonly mes: string;
  readonly pedidos: number;
  readonly vendidoCentavos: number;
  readonly faturadoCentavos: number;
  readonly ticketMedioCentavos: number;
  readonly comissaoPrevistaCentavos: number;
  readonly metaMensalCentavos: number;
  readonly percentualDaMeta: number;
  readonly clientesAtendidos: number;
  readonly porSituacao: readonly { readonly situacao: string; readonly quantidade: number }[];
}
