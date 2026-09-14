import type { ConsultaDeCnpj, EnderecoDoCadastro } from '@synapse/types';

/** Como cada provedor público responde, traduzido para a ficha do Synapse. Sem
 *  I/O: o teste passa a resposta gravada e confere o que sai. */

export type Json = Record<string, unknown>;

export interface EnderecoDoCep {
  readonly cep: string;
  readonly logradouro: string;
  readonly complemento: string;
  readonly bairro: string;
  readonly cidade: string;
  readonly uf: string;
  readonly cidadeCodigoIbge: string | null;
  readonly fonte: string;
}

export const texto = (valor: unknown): string =>
  typeof valor === 'string' ? valor.trim() : typeof valor === 'number' ? String(valor) : '';

export const digitos = (valor: unknown): string => texto(valor).replace(/\D/g, '');

/** "dd/mm/aaaa" ou "aaaa-mm-dd" para "aaaa-mm-dd". */
export const dataIso = (valor: unknown): string | null => {
  const bruto = texto(valor);
  const br = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(bruto);
  if (br) return `${br[3]}-${br[2]}-${br[1]}`;
  return /^\d{4}-\d{2}-\d{2}/.test(bruto) ? bruto.slice(0, 10) : null;
};

export function lerCnpjBrasilApi(cnpj: string, dados: unknown): ConsultaDeCnpj | null {
  const d = dados as Json | null;
  if (!d || !texto(d['razao_social'])) return null;
  return {
    cnpj,
    razaoSocial: texto(d['razao_social']),
    nomeFantasia: texto(d['nome_fantasia']),
    situacao: texto(d['descricao_situacao_cadastral']),
    abertura: dataIso(d['data_inicio_atividade']),
    atividadePrincipal: texto(d['cnae_fiscal_descricao']) || null,
    endereco: enderecoDoCadastro({
      cep: digitos(d['cep']),
      logradouro: [texto(d['descricao_tipo_de_logradouro']), texto(d['logradouro'])]
        .filter(Boolean)
        .join(' '),
      numero: texto(d['numero']),
      complemento: texto(d['complemento']),
      bairro: texto(d['bairro']),
      cidade: texto(d['municipio']),
      uf: texto(d['uf']),
      cidadeCodigoIbge: digitos(d['codigo_municipio_ibge']),
    }),
    telefone: digitos(d['ddd_telefone_1']) || null,
    email: texto(d['email']).toLowerCase() || null,
    simplesNacional: typeof d['opcao_pelo_simples'] === 'boolean' ? d['opcao_pelo_simples'] : null,
    fonte: 'BrasilAPI (Receita Federal)',
  };
}

export function lerCnpjReceitaWs(cnpj: string, dados: unknown): ConsultaDeCnpj | null {
  const d = dados as Json | null;
  if (!d || d['status'] === 'ERROR' || !texto(d['nome'])) return null;
  const atividades = Array.isArray(d['atividade_principal'])
    ? (d['atividade_principal'] as Json[])
    : [];
  const simples = d['simples'] as Json | undefined;
  return {
    cnpj,
    razaoSocial: texto(d['nome']),
    nomeFantasia: texto(d['fantasia']),
    situacao: texto(d['situacao']),
    abertura: dataIso(d['abertura']),
    atividadePrincipal: texto(atividades[0]?.['text']) || null,
    endereco: enderecoDoCadastro({
      cep: digitos(d['cep']),
      logradouro: texto(d['logradouro']),
      numero: texto(d['numero']),
      complemento: texto(d['complemento']),
      bairro: texto(d['bairro']),
      cidade: texto(d['municipio']),
      uf: texto(d['uf']),
      cidadeCodigoIbge: '',
    }),
    telefone: digitos(texto(d['telefone']).split('/')[0]) || null,
    email: texto(d['email']).toLowerCase() || null,
    simplesNacional:
      typeof simples?.['optante'] === 'boolean' ? (simples['optante'] as boolean) : null,
    fonte: 'ReceitaWS (Receita Federal)',
  };
}

export function lerCnpjOpenCnpj(cnpj: string, dados: unknown): ConsultaDeCnpj | null {
  const d = dados as Json | null;
  if (!d || !texto(d['razao_social'])) return null;
  const telefones = Array.isArray(d['telefones']) ? (d['telefones'] as Json[]) : [];
  return {
    cnpj,
    razaoSocial: texto(d['razao_social']),
    nomeFantasia: texto(d['nome_fantasia']),
    situacao: texto(d['situacao_cadastral']),
    abertura: dataIso(d['data_inicio_atividade']),
    atividadePrincipal: texto(d['cnae_principal']) || null,
    endereco: enderecoDoCadastro({
      cep: digitos(d['cep']),
      logradouro: [texto(d['tipo_logradouro']), texto(d['logradouro'])].filter(Boolean).join(' '),
      numero: texto(d['numero']),
      complemento: texto(d['complemento']),
      bairro: texto(d['bairro']),
      cidade: texto(d['municipio']),
      uf: texto(d['uf']),
      cidadeCodigoIbge: '',
    }),
    telefone: telefones[0]
      ? digitos(`${texto(telefones[0]['ddd'])}${texto(telefones[0]['numero'])}`)
      : null,
    email: texto(d['email']).toLowerCase() || null,
    simplesNacional: null,
    fonte: 'OpenCNPJ (Receita Federal)',
  };
}

export function lerCepViaCep(cep: string, dados: unknown): EnderecoDoCep | null {
  const d = dados as Json | null;
  if (!d || d['erro']) return null;
  return {
    cep,
    logradouro: texto(d['logradouro']),
    complemento: texto(d['complemento']),
    bairro: texto(d['bairro']),
    cidade: texto(d['localidade']),
    uf: texto(d['uf']),
    cidadeCodigoIbge: digitos(d['ibge']) || null,
    fonte: 'ViaCEP',
  };
}

export function lerCepBrasilApi(cep: string, dados: unknown): EnderecoDoCep | null {
  const d = dados as Json | null;
  if (!d || !texto(d['city'])) return null;
  return {
    cep,
    logradouro: texto(d['street']),
    complemento: '',
    bairro: texto(d['neighborhood']),
    cidade: texto(d['city']),
    uf: texto(d['state']),
    cidadeCodigoIbge: digitos(d['city_ibge']) || null,
    fonte: 'BrasilAPI',
  };
}

export function enderecoDoCadastro(campos: {
  cep: string;
  logradouro: string;
  numero: string;
  complemento: string;
  bairro: string;
  cidade: string;
  uf: string;
  cidadeCodigoIbge: string;
}): EnderecoDoCadastro {
  return {
    cep: campos.cep,
    logradouro: campos.logradouro,
    numero: campos.numero,
    complemento: campos.complemento || null,
    bairro: campos.bairro,
    cidadeCodigoIbge: campos.cidadeCodigoIbge.length === 7 ? campos.cidadeCodigoIbge : null,
    cidade: campos.cidade.toLocaleUpperCase('pt-BR'),
    uf: campos.uf.toUpperCase(),
    paisCodigo: '1058',
    paisNome: 'BRASIL',
  };
}
