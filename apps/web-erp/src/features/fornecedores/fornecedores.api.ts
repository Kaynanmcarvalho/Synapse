import type { DocumentosDoFornecedor, PaginaDeFornecedores, Supplier } from '@synapse/types';
import { apiRequest } from '../../lib/dev-auth';
import { corpoJson } from '../cadastros/comum/cadastros.api';

/** Cadastro de fornecedores na API (cadastros/fornecedores). */

export const listarFornecedores = (
  filtros: { readonly termo: string; readonly ativo: '' | 'ativos' | 'inativos' },
  cursor: string | null,
): Promise<PaginaDeFornecedores> => {
  const parametros = new URLSearchParams({ limit: '50' });
  if (filtros.termo.trim()) parametros.set('q', filtros.termo.trim());
  if (filtros.ativo) parametros.set('ativo', filtros.ativo);
  if (cursor) parametros.set('cursor', cursor);
  return apiRequest(`/cadastros/fornecedores?${parametros.toString()}`);
};

export const buscarFornecedor = (id: string): Promise<Supplier> =>
  apiRequest(`/cadastros/fornecedores/${id}`);

export const criarFornecedor = (corpo: unknown): Promise<Supplier> =>
  apiRequest('/cadastros/fornecedores', corpoJson('POST', corpo));

export const atualizarFornecedor = (id: string, corpo: unknown): Promise<Supplier> =>
  apiRequest(`/cadastros/fornecedores/${id}`, corpoJson('PUT', corpo));

export const documentosDoFornecedor = (id: string): Promise<DocumentosDoFornecedor> =>
  apiRequest(`/cadastros/fornecedores/${id}/documentos`);
