import type { Customer, PaginaDeClientes, SugestoesDoCadastro } from '@synapse/types';
import { apiRequest } from '../../lib/dev-auth';

/** Conversa com o cadastro de clientes da API. É a mesma coleção que a análise
 *  de crédito, o PDV e a busca global leem — um cliente, um documento. */

export interface FiltrosDaLista {
  readonly termo?: string;
  readonly grupo?: string;
  readonly situacao?: 'REGULAR' | 'OVERDUE' | 'BLOCKED';
  readonly ativo?: 'ativos' | 'inativos';
  readonly limite?: number;
  readonly cursor?: string | null;
}

const consulta = (filtros: FiltrosDaLista): string => {
  const parametros = new URLSearchParams();
  if (filtros.termo?.trim()) parametros.set('q', filtros.termo.trim());
  if (filtros.grupo) parametros.set('grupo', filtros.grupo);
  if (filtros.situacao) parametros.set('situacao', filtros.situacao);
  if (filtros.ativo) parametros.set('ativo', filtros.ativo);
  if (filtros.cursor) parametros.set('cursor', filtros.cursor);
  parametros.set('limit', String(filtros.limite ?? 50));
  return parametros.toString();
};

export const listarClientes = (filtros: FiltrosDaLista = {}): Promise<PaginaDeClientes> =>
  apiRequest(`/catalog/customers?${consulta(filtros)}`);

export const buscarCliente = (id: string): Promise<Customer> =>
  apiRequest(`/catalog/customers/${id}`);

export const sugestoesDoCadastro = (): Promise<SugestoesDoCadastro> =>
  apiRequest('/catalog/customers/sugestoes');

const comCorpo = (metodo: string, corpo: unknown): RequestInit => ({
  method: metodo,
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify(corpo),
});

export const criarCliente = (corpo: unknown): Promise<Customer> =>
  apiRequest('/catalog/customers', comCorpo('POST', corpo));

export const atualizarCliente = (id: string, corpo: unknown): Promise<Customer> =>
  apiRequest(`/catalog/customers/${id}`, comCorpo('PUT', corpo));
