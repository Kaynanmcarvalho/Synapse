import type { PermissionGrant, SystemRoleKey } from '@synapse/types';
import { apiRequest } from '../../lib/dev-auth';

/** O que GET /iam/roles devolve: as oito roles padrao seguidas dos cargos que o
 *  tenant criou. Cargo padrao vem com systemKey e isCustom false. */
export interface RoleView {
  readonly id: string;
  readonly name: string;
  readonly systemKey: SystemRoleKey | null;
  readonly isCustom: boolean;
  readonly permissions: readonly PermissionGrant[];
}

export interface EntradaDeCargo {
  readonly name: string;
  readonly permissions: readonly PermissionGrant[];
}

export const listarCargos = (): Promise<RoleView[]> => apiRequest('/iam/roles');

export const criarCargo = (entrada: EntradaDeCargo): Promise<RoleView> =>
  apiRequest('/iam/roles', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(entrada),
  });

export const salvarCargo = (id: string, entrada: EntradaDeCargo): Promise<RoleView> =>
  apiRequest(`/iam/roles/${id}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(entrada),
  });

export const excluirCargo = (id: string): Promise<{ removed: boolean }> =>
  apiRequest(`/iam/roles/${id}`, { method: 'DELETE' });
