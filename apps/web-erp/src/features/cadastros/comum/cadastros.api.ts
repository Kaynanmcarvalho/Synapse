import type { ConsultaDeCnpj, ItemDeTabela, MeioDePagamento, TipoDeTabela } from '@synapse/types';
import { apiRequest } from '../../../lib/dev-auth';

/** Tabelas auxiliares e consultas públicas (CNPJ, CEP, IBGE) da API. */

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

export interface MunicipioIbge {
  readonly codigo: string;
  readonly nome: string;
  readonly uf: string;
}

export const corpoJson = (metodo: string, corpo: unknown): RequestInit => ({
  method: metodo,
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify(corpo),
});

export const listarTabela = (
  tipo: TipoDeTabela,
  filtros: { readonly termo?: string; readonly somenteAtivos?: boolean } = {},
): Promise<ItemDeTabela[]> => {
  const parametros = new URLSearchParams();
  if (filtros.termo?.trim()) parametros.set('q', filtros.termo.trim());
  if (filtros.somenteAtivos) parametros.set('ativos', 'sim');
  const consulta = parametros.toString();
  return apiRequest(`/cadastros/tabelas/${tipo}${consulta ? `?${consulta}` : ''}`);
};

export const buscarItemDeTabela = (tipo: TipoDeTabela, codigo: number): Promise<ItemDeTabela> =>
  apiRequest(`/cadastros/tabelas/${tipo}/${codigo}`);

export interface DadosDoItem {
  readonly nome: string;
  readonly ativo: boolean;
  readonly meio?: MeioDePagamento;
}

export const criarItemDeTabela = (tipo: TipoDeTabela, dados: DadosDoItem): Promise<ItemDeTabela> =>
  apiRequest(`/cadastros/tabelas/${tipo}`, corpoJson('POST', dados));

export const alterarItemDeTabela = (
  tipo: TipoDeTabela,
  codigo: number,
  dados: DadosDoItem,
): Promise<ItemDeTabela> =>
  apiRequest(`/cadastros/tabelas/${tipo}/${codigo}`, corpoJson('PUT', dados));

export const consultarCnpj = (cnpj: string): Promise<ConsultaDeCnpj> =>
  apiRequest(`/cadastros/consultas/cnpj/${cnpj.replace(/\D/g, '')}`);

export const consultarCep = (cep: string): Promise<EnderecoDoCep> =>
  apiRequest(`/cadastros/consultas/cep/${cep.replace(/\D/g, '')}`);

export const listarMunicipios = (uf: string, termo = ''): Promise<MunicipioIbge[]> =>
  apiRequest(
    `/cadastros/consultas/municipios?uf=${encodeURIComponent(uf)}&q=${encodeURIComponent(termo)}`,
  );

export const buscarMunicipio = (codigo: string): Promise<MunicipioIbge> =>
  apiRequest(`/cadastros/consultas/municipios/${codigo.replace(/\D/g, '')}`);

export const UFS = [
  'AC',
  'AL',
  'AM',
  'AP',
  'BA',
  'CE',
  'DF',
  'ES',
  'GO',
  'MA',
  'MG',
  'MS',
  'MT',
  'PA',
  'PB',
  'PE',
  'PI',
  'PR',
  'RJ',
  'RN',
  'RO',
  'RR',
  'RS',
  'SC',
  'SE',
  'SP',
  'TO',
] as const;
