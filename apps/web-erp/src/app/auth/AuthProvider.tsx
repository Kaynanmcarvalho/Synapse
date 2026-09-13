import { type ReactNode, useCallback, useEffect, useMemo, useState } from 'react';
import { aoPerderSessao, devSignIn, devSignOut, restaurarSessao } from '../../lib/dev-auth';
import { AuthContext, type EstadoDeAutenticacao } from './AuthContext';

export function AuthProvider({ children }: { readonly children: ReactNode }) {
  const [estado, setEstado] = useState<EstadoDeAutenticacao>({ status: 'carregando' });

  useEffect(() => {
    let ativo = true;
    restaurarSessao()
      .then((usuario) => {
        if (!ativo) return;
        setEstado(
          usuario ? { status: 'autenticado', usuario } : { status: 'anonimo', aviso: null },
        );
      })
      .catch((erro: unknown) => {
        if (!ativo) return;
        setEstado({ status: 'anonimo', aviso: erro instanceof Error ? erro.message : null });
      });
    return () => {
      ativo = false;
    };
  }, []);

  // Sessao recusada pela API em qualquer tela: volta ao login, com o motivo.
  useEffect(
    () =>
      aoPerderSessao(() => {
        void devSignOut().finally(() =>
          setEstado({
            status: 'anonimo',
            aviso: 'Sua sessão terminou. Entre novamente para continuar.',
          }),
        );
      }),
    [],
  );

  const entrar = useCallback(async (email: string, senha: string) => {
    const usuario = await devSignIn(email, senha);
    setEstado({ status: 'autenticado', usuario });
  }, []);

  const sair = useCallback(async () => {
    try {
      await devSignOut();
    } finally {
      setEstado({ status: 'anonimo', aviso: null });
    }
  }, []);

  const valor = useMemo(() => ({ estado, entrar, sair }), [estado, entrar, sair]);
  return <AuthContext.Provider value={valor}>{children}</AuthContext.Provider>;
}
