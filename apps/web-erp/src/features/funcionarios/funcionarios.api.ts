import type {
  Funcionario,
  FuncionarioNaLista,
  PaginaDeFuncionarios,
  PedidoDoVendedor,
  ResumoDoVendedor,
} from '@synapse/types';
import { apiRequest } from '../../lib/dev-auth';
import { corpoJson } from '../cadastros/comum/cadastros.api';

/** Cadastro de funcionários na API (cadastros/funcionarios). */

export interface UsuarioDoTenant {
  readonly uid: string;
  readonly email: string;
  readonly nome: string;
  readonly situacao: 'active' | 'blocked';
  readonly cargos: readonly string[];
  readonly funcionario: {
    readonly id: string;
    readonly codigo: number;
    readonly nome: string;
  } | null;
}

export type VendedorNaLista = FuncionarioNaLista & { readonly descontoMaximoPercentual: number };

export const listarFuncionarios = (
  termo: string,
  cursor: string | null,
): Promise<PaginaDeFuncionarios> => {
  const parametros = new URLSearchParams({ limit: '50' });
  if (termo.trim()) parametros.set('q', termo.trim());
  if (cursor) parametros.set('cursor', cursor);
  return apiRequest(`/cadastros/funcionarios?${parametros.toString()}`);
};

export const buscarFuncionario = (id: string): Promise<Funcionario> =>
  apiRequest(`/cadastros/funcionarios/${id}`);

export const criarFuncionario = (corpo: unknown): Promise<Funcionario> =>
  apiRequest('/cadastros/funcionarios', corpoJson('POST', corpo));

export const atualizarFuncionario = (id: string, corpo: unknown): Promise<Funcionario> =>
  apiRequest(`/cadastros/funcionarios/${id}`, corpoJson('PUT', corpo));

export const listarVendedores = (termo = ''): Promise<VendedorNaLista[]> =>
  apiRequest(`/cadastros/funcionarios/vendedores?q=${encodeURIComponent(termo)}`);

export const lerFoto = (id: string): Promise<{ readonly tipo: string; readonly base64: string }> =>
  apiRequest(`/cadastros/funcionarios/${id}/foto`);

export const enviarFoto = (id: string, arquivo: Blob): Promise<Funcionario> => {
  const corpo = new FormData();
  corpo.append('arquivo', arquivo, 'foto.jpg');
  return apiRequest(`/cadastros/funcionarios/${id}/foto`, { method: 'POST', body: corpo });
};

export const removerFoto = (id: string): Promise<Funcionario> =>
  apiRequest(`/cadastros/funcionarios/${id}/foto`, { method: 'DELETE' });

export const listarUsuarios = (): Promise<UsuarioDoTenant[]> =>
  apiRequest('/cadastros/funcionarios/usuarios');

export const definirUsuario = (id: string, uid: string | null): Promise<Funcionario> =>
  apiRequest(`/cadastros/funcionarios/${id}/usuario`, corpoJson('PUT', { uid }));

export const pedidosDoFuncionario = (id: string): Promise<PedidoDoVendedor[]> =>
  apiRequest(`/cadastros/funcionarios/${id}/pedidos`);

export const resumoDoFuncionario = (id: string, mes: string): Promise<ResumoDoVendedor> =>
  apiRequest(`/cadastros/funcionarios/${id}/resumo?mes=${mes}`);
