import type {
  ClassificacaoComercial,
  ContatoDoCliente,
  ControleDeVendas,
  Customer,
  DadosDePessoaJuridica,
  TelefonesDoCliente,
} from '@synapse/types';
import { escreverMoeda, mascararCep, mascararDocumento, mascararTelefone } from './formato';

/** O formulário do cadastro: tudo texto, como o balcão digita. A conversão para
 *  o corpo da API acontece num lugar só (`paraEnvio`), e a volta em `doCliente`.
 *
 *  Guardar número como número aqui atrapalharia a digitação ("1" viraria
 *  "0,01"); guardar texto e converter na saída deixa o campo se comportar. */

export interface ReferenciaNoFormulario {
  readonly id?: string;
  readonly empresa: string;
  readonly contato: string;
  readonly telefone: string;
  readonly observacao: string;
}

export interface SocioNoFormulario {
  readonly nome: string;
  readonly cpf: string;
}

export interface FormularioDoCliente {
  readonly tipo: 'PF' | 'PJ' | 'RURAL_PRODUCER';
  readonly documento: string;
  readonly razaoSocial: string;
  readonly nomeFantasia: string;
  readonly inscricaoEstadual: string;
  readonly indicadorDeIe: 'CONTRIBUINTE' | 'ISENTO' | 'NAO_CONTRIBUINTE';
  readonly inscricaoMunicipal: string;
  readonly regimeTributario: '' | 'SIMPLES_NACIONAL' | 'SIMPLES_EXCESSO' | 'REGIME_NORMAL' | 'MEI';
  readonly cep: string;
  readonly logradouro: string;
  readonly numero: string;
  readonly complemento: string;
  readonly bairro: string;
  readonly cidade: string;
  readonly uf: string;
  readonly codigoIbge: string;
  readonly pais: string;
  readonly telefone1: string;
  readonly telefone2: string;
  readonly celular: string;
  readonly whatsapp: string;
  readonly email: string;
  readonly emailNfe: string;
  readonly vendedor1: string;
  readonly vendedor2: string;
  readonly grupo: string;
  readonly subGrupo: string;
  readonly praca: string;
  readonly limite: string;
  readonly situacao: 'REGULAR' | 'BLOCKED';
  readonly ativo: boolean;
  readonly observacao: string;
  readonly observacaoInterna: string;
  // Pessoa jurídica
  readonly contatoNome: string;
  readonly contatoCelular: string;
  readonly comprador: string;
  readonly compradorFone: string;
  readonly socios: readonly SocioNoFormulario[];
  readonly contabilista: string;
  readonly dataDeAbertura: string;
  readonly ramoDeAtividade: string;
  readonly segmento: string;
  readonly substitutoTributario: boolean;
  readonly revendedor: boolean;
  readonly orgaoPublico: boolean;
  readonly inscricaoSuframa: string;
  readonly temTare: boolean;
  readonly numeroTare: string;
  readonly fomentarOuProduzir: boolean;
  // Referências e controle de vendas
  readonly referencias: readonly ReferenciaNoFormulario[];
  readonly condicaoPadrao: string;
  readonly formaPadrao: string;
  readonly descontoMaximo: string;
  readonly diasParaBloqueio: string;
  readonly autorizacaoDePagamento: 'SEM_RESTRICAO' | 'SOMENTE_A_VISTA';
}

export const FORMULARIO_VAZIO: FormularioDoCliente = {
  tipo: 'PJ',
  documento: '',
  razaoSocial: '',
  nomeFantasia: '',
  inscricaoEstadual: '',
  indicadorDeIe: 'NAO_CONTRIBUINTE',
  inscricaoMunicipal: '',
  regimeTributario: '',
  cep: '',
  logradouro: '',
  numero: '',
  complemento: '',
  bairro: '',
  cidade: '',
  uf: '',
  codigoIbge: '',
  pais: 'BRASIL',
  telefone1: '',
  telefone2: '',
  celular: '',
  whatsapp: '',
  email: '',
  emailNfe: '',
  vendedor1: '',
  vendedor2: '',
  grupo: '',
  subGrupo: '',
  praca: '',
  limite: '0,00',
  situacao: 'REGULAR',
  ativo: true,
  observacao: '',
  observacaoInterna: '',
  contatoNome: '',
  contatoCelular: '',
  comprador: '',
  compradorFone: '',
  socios: [],
  contabilista: '',
  dataDeAbertura: '',
  ramoDeAtividade: '',
  segmento: '',
  substitutoTributario: false,
  revendedor: false,
  orgaoPublico: false,
  inscricaoSuframa: '',
  temTare: false,
  numeroTare: '',
  fomentarOuProduzir: false,
  referencias: [],
  condicaoPadrao: '',
  formaPadrao: '',
  descontoMaximo: '',
  diasParaBloqueio: '',
  autorizacaoDePagamento: 'SEM_RESTRICAO',
};

// Cliente gravado antes da tela nova não tem estes blocos: os vazios abaixo
// entram por baixo, e a ficha abre com os campos em branco em vez de quebrar.

const PJ_VAZIA: DadosDePessoaJuridica = {
  contato: null,
  socios: [],
  contabilista: null,
  dataDeAbertura: null,
  ramoDeAtividade: null,
  segmento: null,
  substitutoTributario: false,
  revendedor: false,
  orgaoPublico: false,
  inscricaoSuframa: null,
  tare: null,
};

const CONTATO_VAZIO: ContatoDoCliente = {
  nome: '',
  celular: null,
  comprador: null,
  foneDoComprador: null,
};

const CLASSIFICACAO_VAZIA: ClassificacaoComercial = {
  grupo: null,
  subGrupo: null,
  pracaOuRegiao: null,
};

const CONTROLE_VAZIO: ControleDeVendas = {
  condicaoDePagamentoPadrao: null,
  formaDePagamentoPadrao: null,
  descontoMaximoPercentual: null,
  diasParaBloqueio: null,
  autorizacaoDePagamento: 'SEM_RESTRICAO',
};

const numeroOuVazio = (valor: number | null): string => (valor === null ? '' : String(valor));

const identificacaoDe = (cliente: Customer): Partial<FormularioDoCliente> => ({
  tipo: cliente.type,
  documento: mascararDocumento(cliente.taxId ?? ''),
  razaoSocial: cliente.legalName ?? '',
  nomeFantasia: cliente.name,
  inscricaoEstadual: cliente.stateRegistration ?? '',
  indicadorDeIe: cliente.indicadorDeIe ?? 'NAO_CONTRIBUINTE',
  inscricaoMunicipal: cliente.municipalRegistration ?? '',
  regimeTributario: cliente.regimeTributario ?? '',
});

const enderecoDe = ({
  address,
  codigoIbgeDaCidade,
  pais,
}: Customer): Partial<FormularioDoCliente> => ({
  cep: mascararCep(address.postalCode ?? ''),
  logradouro: address.street ?? '',
  numero: address.number ?? '',
  complemento: address.complement ?? '',
  bairro: address.district ?? '',
  cidade: address.city ?? '',
  uf: address.state ?? '',
  codigoIbge: codigoIbgeDaCidade ?? '',
  pais: pais ?? 'BRASIL',
});

const telefonesDe = (cliente: Customer): Partial<FormularioDoCliente> => {
  // Cliente antigo só tinha `phone` e `whatsapp` soltos.
  const telefones: TelefonesDoCliente = cliente.telefones ?? {
    principal: cliente.phone ?? '',
    secundario: null,
    celular: null,
    whatsapp: cliente.whatsapp ?? null,
  };
  return {
    telefone1: mascararTelefone(telefones.principal),
    telefone2: mascararTelefone(telefones.secundario ?? ''),
    celular: mascararTelefone(telefones.celular ?? ''),
    whatsapp: mascararTelefone(telefones.whatsapp ?? ''),
    email: cliente.email ?? '',
    emailNfe: cliente.emailNfe ?? '',
  };
};

const comercialDe = (cliente: Customer): Partial<FormularioDoCliente> => {
  const classe = { ...CLASSIFICACAO_VAZIA, ...cliente.classificacao };
  return {
    vendedor1: cliente.responsibleSellerId ?? '',
    vendedor2: cliente.vendedorSecundarioId ?? '',
    grupo: classe.grupo ?? '',
    subGrupo: classe.subGrupo ?? '',
    praca: classe.pracaOuRegiao ?? '',
    limite: escreverMoeda(cliente.creditLimit ?? 0),
    situacao: cliente.financialStatus === 'BLOCKED' ? 'BLOCKED' : 'REGULAR',
    // Cadastro antigo nao tinha o campo: cliente existente e cliente ativo.
    ativo: cliente.active ?? true,
    observacao: cliente.observacao ?? '',
    observacaoInterna: cliente.observacaoInterna ?? '',
  };
};

const pessoaJuridicaDe = (cliente: Customer): Partial<FormularioDoCliente> => {
  const pj = { ...PJ_VAZIA, ...cliente.pessoaJuridica };
  const contato = { ...CONTATO_VAZIO, ...pj.contato };
  return {
    contatoNome: contato.nome,
    contatoCelular: mascararTelefone(contato.celular ?? ''),
    comprador: contato.comprador ?? '',
    compradorFone: mascararTelefone(contato.foneDoComprador ?? ''),
    socios: pj.socios.map((socio) => ({
      nome: socio.nome,
      cpf: mascararDocumento(socio.cpf ?? ''),
    })),
    contabilista: pj.contabilista ?? '',
    dataDeAbertura: pj.dataDeAbertura ?? '',
    ramoDeAtividade: pj.ramoDeAtividade ?? '',
    segmento: pj.segmento ?? '',
    substitutoTributario: pj.substitutoTributario,
    revendedor: pj.revendedor,
    orgaoPublico: pj.orgaoPublico,
    inscricaoSuframa: pj.inscricaoSuframa ?? '',
  };
};

const tareDe = (cliente: Customer): Partial<FormularioDoCliente> => {
  const tare = cliente.pessoaJuridica?.tare ?? null;
  return tare
    ? { temTare: true, numeroTare: tare.numero, fomentarOuProduzir: tare.fomentarOuProduzir }
    : { temTare: false, numeroTare: '', fomentarOuProduzir: false };
};

const referenciasDe = (cliente: Customer): readonly ReferenciaNoFormulario[] =>
  (cliente.referenciasComerciais ?? []).map((referencia) => ({
    id: referencia.id,
    empresa: referencia.empresa,
    contato: referencia.contato ?? '',
    telefone: mascararTelefone(referencia.telefone ?? ''),
    observacao: referencia.observacao ?? '',
  }));

const controleDe = (cliente: Customer): Partial<FormularioDoCliente> => {
  const controle = { ...CONTROLE_VAZIO, ...cliente.controleDeVendas };
  return {
    condicaoPadrao: controle.condicaoDePagamentoPadrao ?? '',
    formaPadrao: controle.formaDePagamentoPadrao ?? '',
    descontoMaximo: numeroOuVazio(controle.descontoMaximoPercentual),
    diasParaBloqueio: numeroOuVazio(controle.diasParaBloqueio),
    autorizacaoDePagamento: controle.autorizacaoDePagamento,
  };
};

/** O cliente gravado vira formulário. Cliente antigo, sem os campos novos,
 *  abre com eles em branco — e não quebra. */
export const doCliente = (cliente: Customer): FormularioDoCliente => ({
  ...FORMULARIO_VAZIO,
  ...identificacaoDe(cliente),
  ...enderecoDe(cliente),
  ...telefonesDe(cliente),
  ...comercialDe(cliente),
  ...pessoaJuridicaDe(cliente),
  ...tareDe(cliente),
  ...controleDe(cliente),
  referencias: referenciasDe(cliente),
});

// A ida para a API mora em envio.ts; reexportada para quem ja importa daqui.
export { paraEnvio } from './envio';
