import { digitos, lerMoeda } from './formato';
import type { FormularioDoCliente } from './formulario';

/** A ida do formulário para a API: o corpo que o schema de cliente valida.
 *  O que estiver em branco vai como nulo — string vazia gravada vira "não
 *  informado" mal contado depois. A volta (`doCliente`) fica em formulario.ts. */

const texto = (valor: string): string | null => valor.trim() || null;
const numero = (valor: string): number | null => (valor.trim() === '' ? null : Number(valor));

const pessoaJuridica = (formulario: FormularioDoCliente) => ({
  contato: formulario.contatoNome.trim()
    ? {
        nome: formulario.contatoNome.trim(),
        celular: digitos(formulario.contatoCelular) || null,
        comprador: texto(formulario.comprador),
        foneDoComprador: digitos(formulario.compradorFone) || null,
      }
    : null,
  socios: formulario.socios
    .filter((socio) => socio.nome.trim())
    .map((socio) => ({ nome: socio.nome.trim(), cpf: digitos(socio.cpf) || null })),
  contabilista: texto(formulario.contabilista),
  dataDeAbertura: texto(formulario.dataDeAbertura),
  ramoDeAtividade: texto(formulario.ramoDeAtividade),
  segmento: texto(formulario.segmento),
  substitutoTributario: formulario.substitutoTributario,
  revendedor: formulario.revendedor,
  orgaoPublico: formulario.orgaoPublico,
  inscricaoSuframa: texto(formulario.inscricaoSuframa),
  tare: formulario.temTare
    ? {
        numero: formulario.numeroTare.trim(),
        fomentarOuProduzir: formulario.fomentarOuProduzir,
      }
    : null,
});

/** O formulário vira o corpo que a API valida. O que estiver em branco vai
 *  como nulo: string vazia gravada vira "não informado" mal contado depois. */
export const paraEnvio = (formulario: FormularioDoCliente): Record<string, unknown> => ({
  type: formulario.tipo,
  taxId: digitos(formulario.documento),
  name: formulario.nomeFantasia.trim() || formulario.razaoSocial.trim(),
  legalName: texto(formulario.razaoSocial),
  stateRegistration: texto(formulario.inscricaoEstadual),
  indicadorDeIe: formulario.indicadorDeIe,
  municipalRegistration: texto(formulario.inscricaoMunicipal),
  regimeTributario: formulario.regimeTributario || null,
  address: {
    street: formulario.logradouro.trim(),
    number: formulario.numero.trim(),
    complement: texto(formulario.complemento),
    district: formulario.bairro.trim(),
    city: formulario.cidade.trim(),
    state: formulario.uf.trim().toUpperCase(),
    postalCode: digitos(formulario.cep),
  },
  codigoIbgeDaCidade: texto(formulario.codigoIbge),
  pais: formulario.pais.trim() || 'BRASIL',
  telefones: {
    principal: digitos(formulario.telefone1),
    secundario: digitos(formulario.telefone2) || null,
    celular: digitos(formulario.celular) || null,
    whatsapp: digitos(formulario.whatsapp) || null,
  },
  email: texto(formulario.email),
  emailNfe: texto(formulario.emailNfe),
  creditLimit: lerMoeda(formulario.limite),
  financialStatus: formulario.situacao,
  active: formulario.ativo,
  responsibleSellerId: texto(formulario.vendedor1),
  vendedorSecundarioId: texto(formulario.vendedor2),
  classificacao: {
    grupo: texto(formulario.grupo),
    subGrupo: texto(formulario.subGrupo),
    pracaOuRegiao: texto(formulario.praca),
  },
  pessoaJuridica: formulario.tipo === 'PJ' ? pessoaJuridica(formulario) : null,
  referenciasComerciais: formulario.referencias
    .filter((referencia) => referencia.empresa.trim())
    .map((referencia) => ({
      ...(referencia.id ? { id: referencia.id } : {}),
      empresa: referencia.empresa.trim(),
      contato: texto(referencia.contato),
      telefone: digitos(referencia.telefone) || null,
      observacao: texto(referencia.observacao),
    })),
  controleDeVendas: {
    condicaoDePagamentoPadrao: texto(formulario.condicaoPadrao),
    formaDePagamentoPadrao: texto(formulario.formaPadrao),
    descontoMaximoPercentual: numero(formulario.descontoMaximo),
    diasParaBloqueio: numero(formulario.diasParaBloqueio),
    autorizacaoDePagamento: formulario.autorizacaoDePagamento,
  },
  observacao: texto(formulario.observacao),
  observacaoInterna: texto(formulario.observacaoInterna),
});
