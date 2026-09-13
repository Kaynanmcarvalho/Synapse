import { CircleAlert, Eye, EyeOff, LoaderCircle } from 'lucide-react';
import { type FormEvent, type InputHTMLAttributes, type ReactNode, useId, useState } from 'react';
import { Navigate, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../../app/auth/AuthContext';
import { ROTAS } from '../../app/rotas';
import { Marca } from '../../app/shell/Marca';

/** O usuario que o `pnpm dev` cria (scripts/seed-dev.mjs). So aparece em dev. */
const USUARIO_DE_TESTE = { email: 'teste.rbac@synapse.dev', senha: 'Senha123!' };

const CLASSE_DO_CAMPO =
  'h-14 w-full rounded-xl border border-hairline-light bg-canvas-light px-4 text-body-md text-ink outline-none transition placeholder:text-stone focus:border-hairline-strong focus:ring-4 focus:ring-primary/15 disabled:bg-surface-soft';

function Campo({
  rotulo,
  acessorio,
  ...props
}: {
  readonly rotulo: string;
  readonly acessorio?: ReactNode;
} & InputHTMLAttributes<HTMLInputElement>) {
  const id = useId();
  return (
    <div>
      <label htmlFor={id} className="text-body-sm text-ink mb-2 block font-semibold">
        {rotulo}
      </label>
      <div className="relative">
        <input id={id} className={`${CLASSE_DO_CAMPO} ${acessorio ? 'pr-14' : ''}`} {...props} />
        {acessorio && (
          <div className="absolute inset-y-0 right-2 flex items-center">{acessorio}</div>
        )}
      </div>
    </div>
  );
}

function BotaoMostrarSenha({
  visivel,
  onAlternar,
}: {
  readonly visivel: boolean;
  readonly onAlternar: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onAlternar}
      aria-label={visivel ? 'Ocultar senha' : 'Mostrar senha'}
      className="text-stone hover:bg-surface-soft hover:text-ink flex h-10 w-10 items-center justify-center rounded-full transition"
    >
      {visivel ? <EyeOff size={18} /> : <Eye size={18} />}
    </button>
  );
}

function DicaDeDesenvolvimento({ onUsar }: { readonly onUsar: () => void }) {
  return (
    <aside className="bg-surface-soft mt-10 rounded-xl p-5">
      <p className="text-body-sm text-ink font-semibold">Ambiente de desenvolvimento</p>
      <p className="text-body-sm text-mute mt-1">
        O <code className="font-mono text-[13px]">pnpm dev</code> cria um usuário de teste:{' '}
        {USUARIO_DE_TESTE.email} / {USUARIO_DE_TESTE.senha}
      </p>
      <button
        type="button"
        onClick={onUsar}
        className="border-hairline-light bg-canvas-light text-button-sm text-ink hover:border-hairline-strong mt-4 inline-flex h-9 items-center rounded-full border px-4 transition"
      >
        Usar usuário de teste
      </button>
    </aside>
  );
}

function FormularioDeLogin({ destino }: { readonly destino: string }) {
  const { entrar } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [senha, setSenha] = useState('');
  const [senhaVisivel, setSenhaVisivel] = useState(false);
  const [enviando, setEnviando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  const enviar = async (evento: FormEvent) => {
    evento.preventDefault();
    setErro(null);
    setEnviando(true);
    try {
      await entrar(email.trim(), senha);
      navigate(destino, { replace: true });
    } catch (falha) {
      setErro(falha instanceof Error ? falha.message : 'Não foi possível entrar.');
      setEnviando(false);
    }
  };

  return (
    <>
      <form className="mt-10 space-y-5" onSubmit={(evento) => void enviar(evento)} noValidate>
        <Campo
          rotulo="E-mail"
          type="email"
          autoComplete="username"
          value={email}
          disabled={enviando}
          onChange={(evento) => setEmail(evento.target.value)}
          placeholder="voce@empresa.com.br"
        />
        <Campo
          rotulo="Senha"
          type={senhaVisivel ? 'text' : 'password'}
          autoComplete="current-password"
          value={senha}
          disabled={enviando}
          onChange={(evento) => setSenha(evento.target.value)}
          acessorio={
            <BotaoMostrarSenha
              visivel={senhaVisivel}
              onAlternar={() => setSenhaVisivel((v) => !v)}
            />
          }
        />
        {erro && (
          <p role="alert" className="text-body-sm text-accent-danger flex items-start gap-2">
            <CircleAlert size={16} className="mt-0.5 shrink-0" aria-hidden="true" /> {erro}
          </p>
        )}
        <button
          type="submit"
          disabled={enviando || !email.trim() || !senha}
          className="bg-canvas-dark text-button-md hover:bg-charcoal disabled:bg-faint inline-flex h-12 w-full items-center justify-center gap-2 rounded-full text-white transition disabled:cursor-not-allowed"
        >
          {enviando && <LoaderCircle size={18} className="animate-spin" aria-hidden="true" />}
          {enviando ? 'Entrando…' : 'Entrar'}
        </button>
      </form>
      {import.meta.env.DEV && (
        <DicaDeDesenvolvimento
          onUsar={() => {
            setEmail(USUARIO_DE_TESTE.email);
            setSenha(USUARIO_DE_TESTE.senha);
            setErro(null);
          }}
        />
      )}
    </>
  );
}

export function LoginScreen() {
  const { estado } = useAuth();
  const location = useLocation();
  const de = (location.state as { de?: string } | null)?.de;
  const destino = de && de !== ROTAS.login ? de : ROTAS.inicio;

  if (estado.status === 'autenticado') return <Navigate to={destino} replace />;
  const aviso = estado.status === 'anonimo' ? estado.aviso : null;

  return (
    <div className="bg-canvas-light flex min-h-screen flex-col">
      <header className="flex h-16 items-center px-6 sm:px-10">
        <Marca />
      </header>
      <main className="flex flex-1 items-center justify-center px-6 py-12">
        <div className="w-full max-w-[420px]">
          <h1 className="font-display text-ink sm:text-display-lg text-[40px] font-medium leading-none tracking-[-0.8px]">
            Entrar
          </h1>
          <p className="text-body-lg text-mute mt-4">Acesse a retaguarda da sua distribuidora.</p>
          {aviso && (
            <p
              role="status"
              className="bg-surface-soft text-body-sm text-charcoal mt-6 rounded-xl px-4 py-3"
            >
              {aviso}
            </p>
          )}
          <FormularioDeLogin destino={destino} />
        </div>
      </main>
      <footer className="text-caption text-stone px-6 py-8 text-center">
        © {new Date().getFullYear()} Synapse
      </footer>
    </div>
  );
}
