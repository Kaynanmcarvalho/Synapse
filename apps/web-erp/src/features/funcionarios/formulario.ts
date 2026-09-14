import type { Funcionario, ReferenciaDeTabela } from '@synapse/types';
import { funcionarioSchema } from '@synapse/validation';
import { escreverMoeda, lerMoeda } from '../customers/formato';
import { errosDoSchema, type ErrosDaFicha } from '../cadastros/comum/caminho';
import type { Validacao } from '../cadastros/comum/useFicha';

/** A ficha do funcionário como a tela edita: o corpo do schema, com dinheiro e
 *  percentual em texto ("1.500,00", "2,5") — o que a pessoa digita. */

const GERAL: ReferenciaDeTabela = { codigo: 1, nome: 'GERAL' };

export interface FormularioDoFuncionario {
  readonly matricula: string;
  readonly nome: string;
  readonly bloqueado: boolean;
  readonly endereco: {
    readonly cep: string;
    readonly logradouro: string;
    readonly bairro: string;
    readonly cidadeCodigoIbge: string;
    readonly cidade: string;
    readonly uf: string;
  };
  readonly telefone: string;
  readonly celular: string;
  readonly cargo: ReferenciaDeTabela;
  readonly praca: ReferenciaDeTabela;
  readonly departamento: ReferenciaDeTabela;
  readonly horaDeEntrada: string;
  readonly horaDeSaida: string;
  readonly admissao: string;
  readonly demissao: string;
  readonly salario: string;
  readonly outrasInformacoes: {
    readonly nascimento: string;
    readonly sexo: string;
    readonly tipoSanguineo: string;
    readonly escolaridade: string;
    readonly email: string;
    readonly pai: string;
    readonly mae: string;
    readonly estadoCivil: string;
    readonly conjuge: string;
    readonly observacoes: string;
  };
  readonly documentos: {
    readonly identidade: string;
    readonly cpf: string;
    readonly pis: string;
    readonly tituloDeEleitor: string;
    readonly ctps: string;
    readonly serieDaCtps: string;
    readonly cnh: string;
    readonly categoriaDaCnh: string;
  };
  readonly comissao: {
    readonly vendedor: boolean;
    readonly percentualAVista: string;
    readonly percentualAPrazo: string;
    readonly base: string;
    readonly descontoMaximoPercentual: string;
    readonly metaMensal: string;
  };
}

const hoje = () => new Date().toISOString().slice(0, 10);

export const funcionarioVazio = (): FormularioDoFuncionario => ({
  matricula: '',
  nome: '',
  bloqueado: false,
  endereco: { cep: '', logradouro: '', bairro: '', cidadeCodigoIbge: '', cidade: '', uf: '' },
  telefone: '',
  celular: '',
  cargo: GERAL,
  praca: GERAL,
  departamento: GERAL,
  horaDeEntrada: '',
  horaDeSaida: '',
  admissao: hoje(),
  demissao: '',
  salario: '0,00',
  outrasInformacoes: {
    nascimento: '',
    sexo: 'NAO_INFORMADO',
    tipoSanguineo: '',
    escolaridade: '',
    email: '',
    pai: '',
    mae: '',
    estadoCivil: 'NAO_INFORMADO',
    conjuge: '',
    observacoes: '',
  },
  documentos: {
    identidade: '',
    cpf: '',
    pis: '',
    tituloDeEleitor: '',
    ctps: '',
    serieDaCtps: '',
    cnh: '',
    categoriaDaCnh: '',
  },
  comissao: {
    vendedor: false,
    percentualAVista: '0',
    percentualAPrazo: '0',
    base: 'FATURAMENTO',
    descontoMaximoPercentual: '0',
    metaMensal: '0,00',
  },
});

const texto = (valor: string | null | undefined) => valor ?? '';
const percentualEmTexto = (valor: number) => String(valor).replace('.', ',');
const lerPercentual = (valor: string): number => {
  const numero = Number(valor.replace(/\./g, '').replace(',', '.'));
  return Number.isFinite(numero) ? numero : Number.NaN;
};

export const doFuncionario = (funcionario: Funcionario): FormularioDoFuncionario => ({
  matricula: texto(funcionario.matricula),
  nome: funcionario.nome,
  bloqueado: funcionario.bloqueado,
  endereco: {
    cep: funcionario.endereco.cep,
    logradouro: funcionario.endereco.logradouro,
    bairro: funcionario.endereco.bairro,
    cidadeCodigoIbge: texto(funcionario.endereco.cidadeCodigoIbge),
    cidade: funcionario.endereco.cidade,
    uf: funcionario.endereco.uf,
  },
  telefone: texto(funcionario.telefone),
  celular: texto(funcionario.celular),
  cargo: funcionario.cargo,
  praca: funcionario.praca,
  departamento: funcionario.departamento,
  horaDeEntrada: texto(funcionario.horaDeEntrada),
  horaDeSaida: texto(funcionario.horaDeSaida),
  admissao: funcionario.admissao,
  demissao: texto(funcionario.demissao),
  salario: escreverMoeda(funcionario.salarioCentavos),
  outrasInformacoes: {
    nascimento: texto(funcionario.outrasInformacoes.nascimento),
    sexo: funcionario.outrasInformacoes.sexo,
    tipoSanguineo: texto(funcionario.outrasInformacoes.tipoSanguineo),
    escolaridade: texto(funcionario.outrasInformacoes.escolaridade),
    email: texto(funcionario.outrasInformacoes.email),
    pai: texto(funcionario.outrasInformacoes.pai),
    mae: texto(funcionario.outrasInformacoes.mae),
    estadoCivil: funcionario.outrasInformacoes.estadoCivil,
    conjuge: texto(funcionario.outrasInformacoes.conjuge),
    observacoes: texto(funcionario.outrasInformacoes.observacoes),
  },
  documentos: {
    identidade: texto(funcionario.documentos.identidade),
    cpf: texto(funcionario.documentos.cpf),
    pis: texto(funcionario.documentos.pis),
    tituloDeEleitor: texto(funcionario.documentos.tituloDeEleitor),
    ctps: texto(funcionario.documentos.ctps),
    serieDaCtps: texto(funcionario.documentos.serieDaCtps),
    cnh: texto(funcionario.documentos.cnh),
    categoriaDaCnh: texto(funcionario.documentos.categoriaDaCnh),
  },
  comissao: {
    vendedor: funcionario.comissao.vendedor,
    percentualAVista: percentualEmTexto(funcionario.comissao.percentualAVista),
    percentualAPrazo: percentualEmTexto(funcionario.comissao.percentualAPrazo),
    base: funcionario.comissao.base,
    descontoMaximoPercentual: percentualEmTexto(funcionario.comissao.descontoMaximoPercentual),
    metaMensal: escreverMoeda(funcionario.comissao.metaMensalCentavos),
  },
});

export const paraEnvio = (formulario: FormularioDoFuncionario) => {
  const { salario, comissao, ...resto } = formulario;
  return {
    ...resto,
    salarioCentavos: lerMoeda(salario),
    comissao: {
      vendedor: comissao.vendedor,
      percentualAVista: lerPercentual(comissao.percentualAVista),
      percentualAPrazo: lerPercentual(comissao.percentualAPrazo),
      base: comissao.base,
      descontoMaximoPercentual: lerPercentual(comissao.descontoMaximoPercentual),
      metaMensalCentavos: lerMoeda(comissao.metaMensal),
    },
  };
};

/** O schema fala em centavos; a tela, no campo de texto. */
const CAMPO_DA_TELA: Readonly<Record<string, string>> = {
  salarioCentavos: 'salario',
  'comissao.metaMensalCentavos': 'comissao.metaMensal',
};

export const validarFuncionario = (formulario: FormularioDoFuncionario): Validacao => {
  const corpo = paraEnvio(formulario);
  const resultado = funcionarioSchema.safeParse(corpo);
  if (resultado.success) return { ok: true, corpo };
  const erros: Record<string, string | undefined> = {};
  for (const [campo, mensagem] of Object.entries(errosDoSchema(resultado.error.issues)))
    erros[CAMPO_DA_TELA[campo] ?? campo] = mensagem;
  return { ok: false, erros };
};

export const ABAS_DO_FUNCIONARIO = [
  { id: 'principal', rotulo: 'Principal' },
  { id: 'outras', rotulo: 'Outras Informações' },
  { id: 'comissao', rotulo: 'Comissão' },
  { id: 'documentos', rotulo: 'Documentos' },
  { id: 'relatorios', rotulo: 'Relatórios' },
] as const;

export type AbaDoFuncionario = (typeof ABAS_DO_FUNCIONARIO)[number]['id'];

export const abaDoCampo = (campo: string): AbaDoFuncionario => {
  if (campo.startsWith('outrasInformacoes') || campo.startsWith('documentos')) return 'outras';
  if (campo.startsWith('comissao')) return 'comissao';
  return 'principal';
};

export const abasComErro = (erros: ErrosDaFicha): AbaDoFuncionario[] => [
  ...new Set(
    Object.entries(erros)
      .filter(([, mensagem]) => Boolean(mensagem))
      .map(([campo]) => abaDoCampo(campo)),
  ),
];
