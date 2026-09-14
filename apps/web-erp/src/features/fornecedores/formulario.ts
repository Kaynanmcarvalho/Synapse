/* eslint-disable complexity -- conversao campo a campo da ficha, com o padrao de cada campo */
import type { ConsultaDeCnpj, ReferenciaDeTabela, Supplier } from '@synapse/types';
import { fornecedorSchema } from '@synapse/validation';
import { errosDoSchema, type ErrosDaFicha } from '../cadastros/comum/caminho';
import type { Validacao } from '../cadastros/comum/useFicha';

/** A ficha do fornecedor como a tela edita: o corpo do schema com números em
 *  texto (prazo de entrega) e o regime vazio no lugar de nulo. */

const GERAL: ReferenciaDeTabela = { codigo: 1, nome: 'GERAL' };

export interface FormularioDoFornecedor {
  readonly tipoDePessoa: 'FISICA' | 'JURIDICA' | 'ESTRANGEIRA';
  readonly documento: string;
  readonly razaoSocial: string;
  readonly nomeFantasia: string;
  readonly ativo: boolean;
  readonly endereco: {
    readonly cep: string;
    readonly logradouro: string;
    readonly numero: string;
    readonly complemento: string;
    readonly bairro: string;
    readonly cidadeCodigoIbge: string;
    readonly cidade: string;
    readonly uf: string;
    readonly paisCodigo: string;
    readonly paisNome: string;
  };
  readonly praca: ReferenciaDeTabela;
  readonly grupo: ReferenciaDeTabela;
  readonly subGrupo: ReferenciaDeTabela;
  readonly regimeTributario: string;
  readonly observacao: string;
  readonly telefone1: { readonly numero: string; readonly whatsapp: boolean };
  readonly telefone2: { readonly numero: string; readonly whatsapp: boolean };
  readonly fax: string;
  readonly site: string;
  readonly email: string;
  readonly emailNfe: string;
  readonly inscricaoEstadual: string;
  readonly indicadorIe: 'CONTRIBUINTE' | 'ISENTO' | 'NAO_CONTRIBUINTE';
  readonly inscricaoMunicipal: string;
  readonly representante: {
    readonly nome: string;
    readonly telefone: string;
    readonly celular: string;
  };
  readonly escrituracao: {
    readonly codigoDoParticipante: string;
    readonly contaContabil: string;
    readonly atividade: string;
    readonly inscricaoSuframa: string;
    readonly nitPis: string;
    readonly geraCreditoPisCofins: boolean;
    readonly retemFunrural: boolean;
    readonly retencoes: {
      readonly irrf: boolean;
      readonly pis: boolean;
      readonly cofins: boolean;
      readonly csll: boolean;
      readonly inss: boolean;
      readonly iss: boolean;
    };
  };
  readonly prazoMedioDeEntregaDias: string;
}

export const fornecedorVazio = (): FormularioDoFornecedor => ({
  tipoDePessoa: 'JURIDICA',
  documento: '',
  razaoSocial: '',
  nomeFantasia: '',
  ativo: true,
  endereco: {
    cep: '',
    logradouro: '',
    numero: '',
    complemento: '',
    bairro: '',
    cidadeCodigoIbge: '',
    cidade: '',
    uf: '',
    paisCodigo: '1058',
    paisNome: 'BRASIL',
  },
  praca: GERAL,
  grupo: GERAL,
  subGrupo: GERAL,
  regimeTributario: '',
  observacao: '',
  telefone1: { numero: '', whatsapp: false },
  telefone2: { numero: '', whatsapp: false },
  fax: '',
  site: '',
  email: '',
  emailNfe: '',
  inscricaoEstadual: '',
  indicadorIe: 'CONTRIBUINTE',
  inscricaoMunicipal: '',
  representante: { nome: '', telefone: '', celular: '' },
  escrituracao: {
    codigoDoParticipante: '',
    contaContabil: '',
    atividade: 'ATACADO',
    inscricaoSuframa: '',
    nitPis: '',
    geraCreditoPisCofins: true,
    retemFunrural: false,
    retencoes: { irrf: false, pis: false, cofins: false, csll: false, inss: false, iss: false },
  },
  prazoMedioDeEntregaDias: '0',
});

const t = (valor: string | null | undefined) => valor ?? '';

export const doFornecedor = (fornecedor: Supplier): FormularioDoFornecedor => {
  const vazio = fornecedorVazio();
  const escrituracao = fornecedor.escrituracao;
  return {
    tipoDePessoa:
      fornecedor.tipoDePessoa ?? (fornecedor.taxId.length === 11 ? 'FISICA' : 'JURIDICA'),
    documento: fornecedor.taxId,
    razaoSocial: fornecedor.legalName,
    nomeFantasia: fornecedor.tradeName,
    ativo: fornecedor.active,
    endereco: fornecedor.endereco
      ? {
          cep: fornecedor.endereco.cep,
          logradouro: fornecedor.endereco.logradouro,
          numero: fornecedor.endereco.numero,
          complemento: t(fornecedor.endereco.complemento),
          bairro: fornecedor.endereco.bairro,
          cidadeCodigoIbge: t(fornecedor.endereco.cidadeCodigoIbge),
          cidade: fornecedor.endereco.cidade,
          uf: fornecedor.endereco.uf,
          paisCodigo: fornecedor.endereco.paisCodigo,
          paisNome: fornecedor.endereco.paisNome,
        }
      : vazio.endereco,
    praca: fornecedor.praca ?? GERAL,
    grupo: fornecedor.grupo ?? GERAL,
    subGrupo: fornecedor.subGrupo ?? GERAL,
    regimeTributario: t(fornecedor.regimeTributario),
    observacao: t(fornecedor.observacao),
    telefone1: fornecedor.telefone1 ?? {
      numero: fornecedor.contacts[0]?.phone ?? '',
      whatsapp: false,
    },
    telefone2: fornecedor.telefone2 ?? vazio.telefone2,
    fax: t(fornecedor.fax),
    site: t(fornecedor.site),
    email: t(fornecedor.email ?? fornecedor.contacts[0]?.email),
    emailNfe: t(fornecedor.emailNfe),
    inscricaoEstadual: fornecedor.stateRegistration,
    indicadorIe: fornecedor.indicadorIe ?? 'CONTRIBUINTE',
    inscricaoMunicipal: t(fornecedor.inscricaoMunicipal),
    representante: {
      nome: t(fornecedor.representante?.nome ?? fornecedor.contacts[0]?.name),
      telefone: t(fornecedor.representante?.telefone),
      celular: t(fornecedor.representante?.celular),
    },
    escrituracao: escrituracao
      ? {
          codigoDoParticipante: t(escrituracao.codigoDoParticipante),
          contaContabil: t(escrituracao.contaContabil),
          atividade: escrituracao.atividade,
          inscricaoSuframa: t(escrituracao.inscricaoSuframa),
          nitPis: t(escrituracao.nitPis),
          geraCreditoPisCofins: escrituracao.geraCreditoPisCofins,
          retemFunrural: escrituracao.retemFunrural,
          retencoes: escrituracao.retencoes,
        }
      : vazio.escrituracao,
    prazoMedioDeEntregaDias: String(fornecedor.averageLeadDays ?? 0),
  };
};

export const paraEnvio = (formulario: FormularioDoFornecedor) => ({
  ...formulario,
  regimeTributario: formulario.regimeTributario || null,
  prazoMedioDeEntregaDias: Number(formulario.prazoMedioDeEntregaDias || 0),
});

export const validarFornecedor = (formulario: FormularioDoFornecedor): Validacao => {
  const corpo = paraEnvio(formulario);
  const resultado = fornecedorSchema.safeParse(corpo);
  return resultado.success
    ? { ok: true, corpo }
    : { ok: false, erros: errosDoSchema(resultado.error.issues) };
};

/** Preenche a ficha com a consulta do CNPJ, sem apagar o que a consulta não traz. */
export const comConsulta = (
  formulario: FormularioDoFornecedor,
  consulta: ConsultaDeCnpj,
): FormularioDoFornecedor => ({
  ...formulario,
  razaoSocial: consulta.razaoSocial.toLocaleUpperCase('pt-BR'),
  nomeFantasia: (consulta.nomeFantasia || consulta.razaoSocial).toLocaleUpperCase('pt-BR'),
  endereco: {
    ...formulario.endereco,
    cep: consulta.endereco.cep || formulario.endereco.cep,
    logradouro: (consulta.endereco.logradouro || formulario.endereco.logradouro).toLocaleUpperCase(
      'pt-BR',
    ),
    numero: consulta.endereco.numero || formulario.endereco.numero,
    complemento: (
      consulta.endereco.complemento ?? formulario.endereco.complemento
    ).toLocaleUpperCase('pt-BR'),
    bairro: (consulta.endereco.bairro || formulario.endereco.bairro).toLocaleUpperCase('pt-BR'),
    cidadeCodigoIbge: consulta.endereco.cidadeCodigoIbge ?? formulario.endereco.cidadeCodigoIbge,
    cidade: consulta.endereco.cidade || formulario.endereco.cidade,
    uf: consulta.endereco.uf || formulario.endereco.uf,
  },
  telefone1: consulta.telefone
    ? { numero: consulta.telefone, whatsapp: formulario.telefone1.whatsapp }
    : formulario.telefone1,
  email: consulta.email ?? formulario.email,
  regimeTributario:
    consulta.simplesNacional === true
      ? 'SIMPLES_NACIONAL'
      : consulta.simplesNacional === false && !formulario.regimeTributario
        ? 'REGIME_NORMAL'
        : formulario.regimeTributario,
});

export const ABAS_DO_FORNECEDOR = [
  { id: 'principal', rotulo: 'Principal' },
  { id: 'documentos', rotulo: 'Documentos' },
  { id: 'escrituracao', rotulo: 'Escrituração Digital' },
] as const;

export type AbaDoFornecedor = (typeof ABAS_DO_FORNECEDOR)[number]['id'];

export const abaDoCampo = (campo: string): AbaDoFornecedor =>
  campo.startsWith('escrituracao') ? 'escrituracao' : 'principal';

export const abasComErro = (erros: ErrosDaFicha): AbaDoFornecedor[] => [
  ...new Set(
    Object.entries(erros)
      .filter(([, mensagem]) => Boolean(mensagem))
      .map(([campo]) => abaDoCampo(campo)),
  ),
];
