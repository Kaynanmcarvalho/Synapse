import { clienteSchema } from '@synapse/validation';
import type { FormularioDoCliente } from './formulario';
import { paraEnvio } from './formulario';

/** A tela valida com o mesmo schema da API — regra de cadastro existe num lugar
 *  só. Aqui a única tradução é do caminho do erro para o campo da tela, para o
 *  aviso aparecer embaixo do campo certo e a aba certa abrir. */

export type ErrosDoFormulario = Partial<Record<keyof FormularioDoCliente, string>>;

const CAMPO_POR_CAMINHO: Record<string, keyof FormularioDoCliente> = {
  taxId: 'documento',
  name: 'nomeFantasia',
  legalName: 'razaoSocial',
  stateRegistration: 'inscricaoEstadual',
  municipalRegistration: 'inscricaoMunicipal',
  email: 'email',
  emailNfe: 'emailNfe',
  creditLimit: 'limite',
  'address.street': 'logradouro',
  'address.number': 'numero',
  'address.district': 'bairro',
  'address.city': 'cidade',
  'address.state': 'uf',
  'address.postalCode': 'cep',
  'telefones.principal': 'telefone1',
  'telefones.secundario': 'telefone2',
  'telefones.celular': 'celular',
  'telefones.whatsapp': 'whatsapp',
  'pessoaJuridica.dataDeAbertura': 'dataDeAbertura',
  'pessoaJuridica.contato.celular': 'contatoCelular',
  'pessoaJuridica.contato.foneDoComprador': 'compradorFone',
  'pessoaJuridica.inscricaoSuframa': 'inscricaoSuframa',
  'pessoaJuridica.tare.numero': 'numeroTare',
  'controleDeVendas.descontoMaximoPercentual': 'descontoMaximo',
  'controleDeVendas.diasParaBloqueio': 'diasParaBloqueio',
};

/** Em que aba está cada campo: o "salvar" que falha precisa abrir a aba do erro,
 *  senão o aviso fica escondido atrás de uma aba fechada. */
export const ABA_DO_CAMPO: Partial<Record<keyof FormularioDoCliente, string>> = {
  documento: 'principal',
  nomeFantasia: 'principal',
  razaoSocial: 'principal',
  inscricaoEstadual: 'principal',
  inscricaoMunicipal: 'principal',
  email: 'principal',
  emailNfe: 'principal',
  limite: 'principal',
  logradouro: 'principal',
  numero: 'principal',
  bairro: 'principal',
  cidade: 'principal',
  uf: 'principal',
  cep: 'principal',
  telefone1: 'principal',
  telefone2: 'principal',
  celular: 'principal',
  whatsapp: 'principal',
  dataDeAbertura: 'pessoa-juridica',
  contatoCelular: 'pessoa-juridica',
  compradorFone: 'pessoa-juridica',
  inscricaoSuframa: 'pessoa-juridica',
  numeroTare: 'pessoa-juridica',
  socios: 'pessoa-juridica',
  referencias: 'referencias',
  descontoMaximo: 'controle-de-vendas',
  diasParaBloqueio: 'principal',
};

/** Sócio e referência são listas: o erro aponta a linha, e a tela mostra o aviso
 *  na lista inteira — melhor do que sumir com ele. */
const campoDaLista = (caminho: string): keyof FormularioDoCliente | null => {
  if (caminho.startsWith('pessoaJuridica.socios')) return 'socios';
  if (caminho.startsWith('referenciasComerciais')) return 'referencias';
  return null;
};

export const validar = (formulario: FormularioDoCliente): ErrosDoFormulario => {
  const resultado = clienteSchema.safeParse(paraEnvio(formulario));
  if (resultado.success) return {};
  const erros: ErrosDoFormulario = {};
  for (const problema of resultado.error.issues) {
    const caminho = problema.path.join('.');
    const campo =
      CAMPO_POR_CAMINHO[caminho] ??
      campoDaLista(caminho) ??
      CAMPO_POR_CAMINHO[caminho.replace(/\.\d+\./, '.')];
    if (campo && !erros[campo]) erros[campo] = problema.message;
  }
  return erros;
};

/** A primeira aba que tem erro — para onde a tela vai quando o salvar falha. */
export const primeiraAbaComErro = (erros: ErrosDoFormulario): string | null => {
  for (const campo of Object.keys(erros) as (keyof FormularioDoCliente)[]) {
    const aba = ABA_DO_CAMPO[campo];
    if (aba) return aba;
  }
  return null;
};
