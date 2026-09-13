import { createContext, useContext } from 'react';
import type { UsuarioDaSessao } from '../../lib/dev-auth';

export type EstadoDeAutenticacao =
  | { readonly status: 'carregando' }
  | { readonly status: 'anonimo'; readonly aviso: string | null }
  | { readonly status: 'autenticado'; readonly usuario: UsuarioDaSessao };

export interface ContextoDeAutenticacao {
  readonly estado: EstadoDeAutenticacao;
  readonly entrar: (email: string, senha: string) => Promise<void>;
  readonly sair: () => Promise<void>;
}

export const AuthContext = createContext<ContextoDeAutenticacao | null>(null);

export const useAuth = (): ContextoDeAutenticacao => {
  const contexto = useContext(AuthContext);
  if (!contexto) throw new Error('useAuth precisa estar dentro de <AuthProvider>');
  return contexto;
};

/** So vale dentro de <RequireAuth>, onde o usuario ja esta garantido. */
export const useUsuario = (): UsuarioDaSessao => {
  const { estado } = useAuth();
  if (estado.status !== 'autenticado') {
    throw new Error('useUsuario so pode ser usado em rota protegida por <RequireAuth>');
  }
  return estado.usuario;
};
