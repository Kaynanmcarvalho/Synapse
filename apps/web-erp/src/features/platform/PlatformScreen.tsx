/* eslint-disable max-lines, max-lines-per-function */
import { useEffect, useState } from 'react';
import {
  CheckCircle2,
  CircleDashed,
  Landmark,
  Loader2,
  Receipt,
  ShieldAlert,
  Truck,
  type LucideIcon,
} from 'lucide-react';
import {
  activateProduction,
  devSignIn,
  getOnboardingStatus,
  isSignedIn,
  listIntegrations,
  runHomologationTest,
  testIntegrationConnection,
  type IntegrationServiceId,
  type IntegrationStatus,
  type IntegrationTestResult,
  type OnboardingStatus,
} from './platform.api';

const SERVICE_ICON: Record<IntegrationServiceId, LucideIcon> = {
  SEFAZ_NFE: Receipt,
  SEFAZ_NFCE: Receipt,
  MDFE: Truck,
  SICREDI: Landmark,
  ITAU: Landmark,
};

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
    <main className="bg-canvas-light flex min-h-screen items-center justify-center p-8 dark:bg-slate-950">
      <div className="w-full max-w-sm rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-700 dark:bg-slate-900">
        <h2 className="text-sm font-bold text-slate-900 dark:text-slate-100">
          Entrar (emulador local)
        </h2>
        <div className="mt-4 flex flex-col gap-3">
          <input
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            placeholder="e-mail"
            className="h-11 rounded-xl border border-slate-200 px-3 text-sm outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 dark:border-slate-700"
          />
          <input
            type="password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            placeholder="senha"
            className="h-11 rounded-xl border border-slate-200 px-3 text-sm outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 dark:border-slate-700"
          />
          {error && <p className="text-xs text-red-600">{error}</p>}
          <button
            type="button"
            onClick={submit}
            disabled={loading}
            className="h-11 rounded-xl bg-blue-600 text-sm font-bold text-white transition hover:bg-blue-700 disabled:opacity-50"
          >
            {loading ? 'Entrando…' : 'Entrar'}
          </button>
        </div>
      </div>
    </main>
  );
}

function TestResultBadge({ result }: { readonly result: IntegrationTestResult | null }) {
  if (!result) return <span className="text-[11px] text-slate-400">nunca testado</span>;
  return (
    <span
      className={`text-[11px] font-semibold ${result.success ? 'text-emerald-600' : 'text-rose-600'}`}
    >
      {result.success ? 'OK' : 'Falhou'} · {new Date(result.occurredAt).toLocaleString('pt-BR')}
    </span>
  );
}

function firstErrorMessage(
  test: IntegrationTestResult | null,
  homolog: IntegrationTestResult | null,
): string | null {
  if (test && !test.success) return test.message;
  if (homolog && !homolog.success) return homolog.message;
  return null;
}

function IntegrationCard({ integration }: { readonly integration: IntegrationStatus }) {
  const [busy, setBusy] = useState<'test' | 'homolog' | null>(null);
  const [test, setTest] = useState(integration.lastTest);
  const [homolog, setHomolog] = useState(integration.lastHomologationTest);
  const Icon = SERVICE_ICON[integration.service];

  const runTest = async () => {
    setBusy('test');
    try {
      setTest(await testIntegrationConnection(integration.service));
    } finally {
      setBusy(null);
    }
  };

  const runHomolog = async () => {
    setBusy('homolog');
    try {
      setHomolog(await runHomologationTest(integration.service));
    } finally {
      setBusy(null);
    }
  };

  return (
    <article className="border-hairline-light bg-canvas-light rounded-2xl border p-5 dark:bg-slate-900">
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-3">
          <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400">
            <Icon size={18} />
          </span>
          <div>
            <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">
              {integration.label}
            </h3>
            <p className="text-[11px] text-slate-400">Ambiente: {integration.environment}</p>
          </div>
        </div>
        <span
          className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${
            integration.credentialsConfigured
              ? 'bg-emerald-50 text-emerald-700'
              : 'bg-amber-50 text-amber-700'
          }`}
        >
          {integration.credentialsConfigured ? 'Credenciais OK' : 'Não configurado'}
        </span>
      </div>

      <dl className="mt-4 space-y-1.5 text-xs">
        <div className="flex items-center justify-between">
          <dt className="text-slate-400">Última conexão</dt>
          <dd>
            <TestResultBadge result={test} />
          </dd>
        </div>
        <div className="flex items-center justify-between">
          <dt className="text-slate-400">Última homologação</dt>
          <dd>
            <TestResultBadge result={homolog} />
          </dd>
        </div>
      </dl>

      {firstErrorMessage(test, homolog) && (
        <p className="mt-3 rounded-lg bg-rose-50 p-2 text-[11px] text-rose-700">
          {firstErrorMessage(test, homolog)}
        </p>
      )}

      <div className="mt-4 flex gap-2">
        <button
          type="button"
          onClick={runTest}
          disabled={busy !== null}
          className="flex h-9 flex-1 items-center justify-center gap-1.5 rounded-lg border border-slate-200 text-xs font-bold text-slate-600 transition hover:bg-slate-50 disabled:opacity-50 dark:border-slate-700 dark:text-slate-300"
        >
          {busy === 'test' && <Loader2 size={12} className="animate-spin" />} Testar conexão
        </button>
        <button
          type="button"
          onClick={runHomolog}
          disabled={busy !== null}
          className="flex h-9 flex-1 items-center justify-center gap-1.5 rounded-lg bg-slate-950 text-xs font-bold text-white transition hover:bg-blue-600 disabled:opacity-50"
        >
          {busy === 'homolog' && <Loader2 size={12} className="animate-spin" />} Teste de
          homologação
        </button>
      </div>
    </article>
  );
}

function OnboardingWizard({
  status,
  onActivated,
}: {
  readonly status: OnboardingStatus;
  readonly onActivated: (status: OnboardingStatus) => void;
}) {
  const [confirmation, setConfirmation] = useState('');
  const [activating, setActivating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const activate = async () => {
    setActivating(true);
    setError(null);
    try {
      onActivated(await activateProduction(confirmation));
    } catch (cause) {
      setError((cause as Error).message);
    } finally {
      setActivating(false);
    }
  };

  const alreadyActive = status.productionActivatedAt !== null;

  return (
    <section className="border-hairline-light bg-canvas-light mt-8 overflow-hidden rounded-3xl border dark:bg-slate-900">
      <div className="border-b border-slate-100 p-6">
        <h2 className="text-lg font-bold text-slate-900 dark:text-slate-100">
          Assistente de ativação
        </h2>
        <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
          As dez etapas do §65 — produção só libera quando as nove primeiras estão completas.
        </p>
      </div>
      <ol className="divide-y divide-slate-100">
        {status.steps.map((step, index) => (
          <li key={step.id} className="flex items-center gap-3 px-6 py-3">
            {step.completed ? (
              <CheckCircle2 size={18} className="shrink-0 text-emerald-500" />
            ) : (
              <CircleDashed size={18} className="shrink-0 text-slate-300" />
            )}
            <span className="flex-1">
              <span className="block text-sm font-semibold text-slate-800 dark:text-slate-200">
                {index + 1}. {step.label}
                {!step.required && (
                  <span className="ml-2 text-[10px] font-bold uppercase text-slate-400">meta</span>
                )}
              </span>
              <span className="block text-xs text-slate-400">{step.detail}</span>
            </span>
          </li>
        ))}
      </ol>

      <div className="border-t border-slate-100 bg-slate-50/60 p-6">
        {alreadyActive ? (
          <p className="flex items-center gap-2 text-sm font-semibold text-emerald-700">
            <CheckCircle2 size={16} /> Produção ativada em{' '}
            {new Date(status.productionActivatedAt as string).toLocaleString('pt-BR')} por{' '}
            {status.productionActivatedBy}
          </p>
        ) : (
          <>
            <p className="flex items-center gap-2 text-xs font-semibold text-amber-700">
              <ShieldAlert size={14} /> Ativar produção é irreversível. Digite{' '}
              <code className="rounded bg-amber-100 px-1">ATIVAR PRODUCAO</code> para confirmar.
            </p>
            <div className="mt-3 flex gap-2">
              <input
                value={confirmation}
                onChange={(event) => setConfirmation(event.target.value)}
                placeholder="ATIVAR PRODUCAO"
                disabled={!status.readyForProduction}
                className="h-10 flex-1 rounded-lg border border-slate-200 px-3 text-sm outline-none focus:border-blue-500 disabled:bg-slate-100 dark:border-slate-700"
              />
              <button
                type="button"
                onClick={activate}
                disabled={
                  !status.readyForProduction || activating || confirmation !== 'ATIVAR PRODUCAO'
                }
                className="h-10 rounded-lg bg-rose-600 px-4 text-xs font-bold text-white transition hover:bg-rose-700 disabled:opacity-40"
              >
                {activating ? 'Ativando…' : 'Ativar produção'}
              </button>
            </div>
            {!status.readyForProduction && (
              <p className="mt-2 text-[11px] text-slate-400">
                Complete as etapas obrigatórias pendentes acima antes de ativar.
              </p>
            )}
            {error && <p className="mt-2 text-xs text-red-600">{error}</p>}
          </>
        )}
      </div>
    </section>
  );
}

export function PlatformScreen() {
  const [signedIn, setSignedIn] = useState(false);
  const [integrations, setIntegrations] = useState<IntegrationStatus[]>([]);
  const [onboarding, setOnboarding] = useState<OnboardingStatus | null>(null);
  const [loading, setLoading] = useState(false);

  const refresh = async () => {
    setLoading(true);
    try {
      const [integrationsResult, onboardingResult] = await Promise.all([
        listIntegrations(),
        getOnboardingStatus(),
      ]);
      setIntegrations(integrationsResult);
      setOnboarding(onboardingResult);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => setSignedIn(isSignedIn()), []);
  useEffect(() => {
    if (signedIn) void refresh();
  }, [signedIn]);

  if (!signedIn) return <LoginPanel onSignedIn={() => setSignedIn(true)} />;

  return (
    <main className="bg-canvas-light relative min-h-screen overflow-hidden text-slate-950 dark:bg-slate-950 dark:text-slate-100">
      <div className="relative mx-auto max-w-7xl px-5 py-8 sm:px-8 lg:px-10 lg:py-10">
        <header>
          <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-[0.18em] text-blue-600">
            <span className="h-1.5 w-1.5 rounded-full bg-blue-600" /> Plataforma
          </div>
          <h1 className="mt-3 text-3xl font-bold tracking-[-0.035em] text-slate-950 sm:text-4xl dark:text-slate-100">
            Central de Integrações e onboarding
          </h1>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-500 dark:text-slate-400">
            Veja se cada integração fiscal e bancária está de pé, e siga o assistente de ativação
            antes de liberar produção.
          </p>
        </header>

        {loading && integrations.length === 0 ? (
          <p className="mt-8 text-sm text-slate-400">Carregando…</p>
        ) : (
          <>
            <section className="mt-8 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
              {integrations.map((integration) => (
                <IntegrationCard key={integration.service} integration={integration} />
              ))}
            </section>

            {onboarding && <OnboardingWizard status={onboarding} onActivated={setOnboarding} />}
          </>
        )}
      </div>
    </main>
  );
}
