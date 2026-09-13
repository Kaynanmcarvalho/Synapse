import { LoaderCircle } from 'lucide-react';
import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { ROTAS } from '../rotas';
import { Marca } from '../shell/Marca';
import { useAuth } from './AuthContext';

function TelaDeCarregamento() {
  return (
    <div
      aria-busy="true"
      className="bg-canvas-light flex min-h-screen flex-col items-center justify-center gap-6"
    >
      <Marca />
      <span className="text-body-sm text-stone flex items-center gap-2">
        <LoaderCircle size={16} className="animate-spin" aria-hidden="true" /> Abrindo o Synapse…
      </span>
    </div>
  );
}

/** Nenhuma tela da retaguarda abre sem login. Quem chega sem sessao vai para o
 *  login e, depois de entrar, volta exatamente para onde tentou ir. */
export function RequireAuth() {
  const { estado } = useAuth();
  const location = useLocation();

  if (estado.status === 'carregando') return <TelaDeCarregamento />;
  if (estado.status === 'anonimo') {
    return (
      <Navigate to={ROTAS.login} replace state={{ de: `${location.pathname}${location.search}` }} />
    );
  }
  return <Outlet />;
}
