import { useEffect, useState } from 'react';
import { Gauge, ShoppingBag, Users, type LucideIcon } from 'lucide-react';
import { NavLink, Outlet } from 'react-router-dom';
import { devSignIn, isSignedIn } from '../lib/dev-auth';

function LoginPanel({ onSignedIn }: { readonly onSignedIn: () => void }) {
  const [email, setEmail] = useState('teste.rbac@synapse.dev');
  const [password, setPassword] = useState('Senha123!');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async () => {
    setLoading(true);
    setError(null);
    try {
      await devSignIn(email, password);
      onSignedIn();
    } catch (cause) {
      setError((cause as Error).message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="flex min-h-screen items-center justify-center bg-[#f6f8fb] p-6">
      <div className="w-full max-w-sm rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <h1 className="text-lg font-extrabold text-slate-950">Synapse Vendedor</h1>
        <p className="mt-1 text-xs text-slate-500">Entrar (emulador local)</p>
        <div className="mt-4 flex flex-col gap-3">
          <input
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            placeholder="e-mail"
            className="h-12 rounded-xl border border-slate-200 px-3 text-sm outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10"
          />
          <input
            type="password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            placeholder="senha"
            className="h-12 rounded-xl border border-slate-200 px-3 text-sm outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10"
          />
          {error && <p className="text-xs text-red-600">{error}</p>}
          <button
            type="button"
            onClick={submit}
            disabled={loading}
            className="h-12 rounded-xl bg-blue-600 text-sm font-bold text-white transition hover:bg-blue-700 disabled:opacity-50"
          >
            {loading ? 'Entrando…' : 'Entrar'}
          </button>
        </div>
      </div>
    </main>
  );
}

interface TabItem {
  readonly label: string;
  readonly path: string;
  readonly icon: LucideIcon;
}

const TABS: TabItem[] = [
  { label: 'Painel', path: '/painel', icon: Gauge },
  { label: 'Clientes', path: '/clientes', icon: Users },
  { label: 'Pedidos', path: '/pedidos', icon: ShoppingBag },
];

/** §27 "mesma operação do app, pelo navegador" — navegação por abas fixas no
 *  rodapé é o padrão de app mobile que um vendedor externo já conhece, ao
 *  contrário da barra lateral do ERP (feita pra tela grande). A mesma barra
 *  também funciona em desktop (max-w centralizado), então "responsivo" não
 *  é um layout separado, é o mesmo com mais espaço em volta. */
export function AppShell() {
  const [signedIn, setSignedIn] = useState(false);

  useEffect(() => setSignedIn(isSignedIn()), []);

  if (!signedIn) return <LoginPanel onSignedIn={() => setSignedIn(true)} />;

  return (
    <div className="min-h-screen bg-[#f6f8fb] pb-20">
      <div className="mx-auto max-w-2xl">
        <Outlet />
      </div>
      <nav
        className="fixed inset-x-0 bottom-0 z-30 border-t border-slate-200 bg-white/95 backdrop-blur-lg"
        aria-label="Navegação principal"
      >
        <div className="mx-auto flex max-w-2xl items-stretch">
          {TABS.map((tab) => {
            const Icon = tab.icon;
            return (
              <NavLink
                key={tab.path}
                to={tab.path}
                className={({ isActive }) =>
                  `flex flex-1 flex-col items-center gap-1 py-2.5 text-[11px] font-bold transition ${
                    isActive ? 'text-blue-600' : 'text-slate-400'
                  }`
                }
              >
                <Icon size={20} />
                {tab.label}
              </NavLink>
            );
          })}
        </div>
      </nav>
    </div>
  );
}
