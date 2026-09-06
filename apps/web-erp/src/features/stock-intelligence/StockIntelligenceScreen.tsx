/* eslint-disable max-lines, max-lines-per-function */
import { useEffect, useMemo, useState, type ReactNode } from 'react';
import {
  adjustSuggestion,
  devSignIn,
  isSignedIn,
  listStockIntelligence,
  recalculateStockIntelligence,
  type AbcClass,
  type ListFilters,
  type StockIntelligenceMetric,
} from './stock-intelligence.api';

interface IconProps {
  readonly children: ReactNode;
  readonly className?: string;
}

const Icon = ({ children, className = 'h-5 w-5' }: IconProps) => (
  <svg
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.8"
    strokeLinecap="round"
    strokeLinejoin="round"
    className={className}
    aria-hidden="true"
  >
    {children}
  </svg>
);

const icons = {
  gauge: (
    <Icon>
      <path d="M12 20a8 8 0 1 0 0-16 8 8 0 0 0 0 16Z" />
      <path d="M12 12 16 8M12 4v2M20 12h-2M4 12h2" />
    </Icon>
  ),
  boxOff: (
    <Icon>
      <path d="m21 8-9 5-9-5 9-5 9 5Z" />
      <path d="M3 8v8l9 5 9-5V8M12 13v8" />
    </Icon>
  ),
  layers: (
    <Icon>
      <path d="m12 2 9 5-9 5-9-5 9-5Z" />
      <path d="m3 12 9 5 9-5M3 17l9 5 9-5" />
    </Icon>
  ),
  cart: (
    <Icon>
      <path d="M3 4h2l2.4 12.4a2 2 0 0 0 2 1.6h7.2a2 2 0 0 0 2-1.6L21 8H6" />
      <path d="M9 20a1 1 0 1 0 0-2 1 1 0 0 0 0 2ZM18 20a1 1 0 1 0 0-2 1 1 0 0 0 0 2Z" />
    </Icon>
  ),
  refresh: (
    <Icon className="h-4 w-4">
      <path d="M20 7h-5V2M4 17h5v5" />
      <path d="M18.5 17a8 8 0 0 1-13.8-2M5.5 7a8 8 0 0 1 13.8 2" />
    </Icon>
  ),
  check: (
    <Icon className="h-3.5 w-3.5">
      <path d="m5 12 4 4L19 6" />
    </Icon>
  ),
};

const ABC_STYLE: Record<AbcClass, string> = {
  A: 'bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200',
  B: 'bg-amber-50 text-amber-700 ring-1 ring-amber-200',
  C: 'bg-slate-100 text-slate-500 ring-1 ring-slate-200',
};

function AbcBadge({ value }: { readonly value: AbcClass }) {
  return (
    <span
      className={`inline-flex h-6 min-w-6 items-center justify-center rounded-md px-1.5 text-[11px] font-bold ${ABC_STYLE[value]}`}
    >
      {value}
    </span>
  );
}

type FilterKey = 'all' | 'A' | 'B' | 'C' | 'deadStock' | 'excess' | 'suggested';

const FILTER_OPTIONS: Array<{ key: FilterKey; label: string }> = [
  { key: 'all', label: 'Todos' },
  { key: 'A', label: 'Classe A' },
  { key: 'B', label: 'Classe B' },
  { key: 'C', label: 'Classe C' },
  { key: 'deadStock', label: 'Parado' },
  { key: 'excess', label: 'Excesso' },
  { key: 'suggested', label: 'Sugestão de compra' },
];

const filterToQuery = (filter: FilterKey): ListFilters => {
  switch (filter) {
    case 'A':
    case 'B':
    case 'C':
      return { abcClass: filter };
    case 'deadStock':
      return { onlyDeadStock: true };
    case 'excess':
      return { onlyExcess: true };
    case 'suggested':
      return { onlySuggested: true };
    default:
      return {};
  }
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
    <main className="flex min-h-screen items-center justify-center bg-[#f6f8fb] p-8">
      <div className="w-full max-w-sm rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <h2 className="text-sm font-bold text-slate-900">Entrar (emulador local)</h2>
        <div className="mt-4 flex flex-col gap-3">
          <input
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            placeholder="e-mail"
            className="h-11 rounded-xl border border-slate-200 px-3 text-sm outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10"
          />
          <input
            type="password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            placeholder="senha"
            className="h-11 rounded-xl border border-slate-200 px-3 text-sm outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10"
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

function SuggestionCell({
  metric,
  branchId,
  onAdjusted,
}: {
  readonly metric: StockIntelligenceMetric;
  readonly branchId: string;
  readonly onAdjusted: (updated: StockIntelligenceMetric) => void;
}) {
  const [value, setValue] = useState(
    String(metric.approvedPurchaseQty ?? metric.suggestedPurchaseQty),
  );
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  const save = async () => {
    const quantity = Number(value);
    if (!Number.isFinite(quantity) || quantity < 0) return;
    setSaving(true);
    try {
      const updated = await adjustSuggestion(metric.productId, branchId, Math.round(quantity));
      onAdjusted(updated);
      setSaved(true);
      window.setTimeout(() => setSaved(false), 1800);
    } finally {
      setSaving(false);
    }
  };

  const adjusted = metric.approvedPurchaseQty !== null;

  return (
    <div className="flex items-center justify-end gap-1.5">
      <span className="text-[11px] text-slate-400">
        sugerido <strong className="text-slate-600">{metric.suggestedPurchaseQty}</strong>
      </span>
      <input
        type="number"
        min={0}
        value={value}
        onChange={(event) => setValue(event.target.value)}
        className={`h-8 w-20 rounded-lg border px-2 text-right text-xs font-bold outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 ${
          adjusted ? 'border-blue-200 bg-blue-50 text-blue-700' : 'border-slate-200 text-slate-800'
        }`}
      />
      <button
        type="button"
        onClick={save}
        disabled={saving}
        className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 transition hover:bg-emerald-50 hover:text-emerald-600 disabled:opacity-40"
        aria-label="Aprovar quantidade"
      >
        {saved ? <span className="text-emerald-600">{icons.check}</span> : '✓'}
      </button>
    </div>
  );
}

export function StockIntelligenceScreen() {
  const [signedIn, setSignedIn] = useState(false);
  const [branchId, setBranchId] = useState('matriz');
  const [filter, setFilter] = useState<FilterKey>('all');
  const [metrics, setMetrics] = useState<StockIntelligenceMetric[]>([]);
  const [loading, setLoading] = useState(false);
  const [recalculating, setRecalculating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const refresh = async () => {
    if (!branchId.trim()) return;
    setLoading(true);
    setError(null);
    try {
      const items = await listStockIntelligence(branchId.trim(), filterToQuery(filter));
      setMetrics(items);
    } catch (cause) {
      setError((cause as Error).message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => setSignedIn(isSignedIn()), []);
  useEffect(() => {
    if (signedIn) void refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [signedIn, branchId, filter]);

  const recalculate = async () => {
    setRecalculating(true);
    setError(null);
    try {
      await recalculateStockIntelligence(branchId.trim());
      await refresh();
    } catch (cause) {
      setError((cause as Error).message);
    } finally {
      setRecalculating(false);
    }
  };

  const summary = useMemo(() => {
    const classA = metrics.filter((metric) => metric.abc.byRevenue === 'A').length;
    const deadStock = metrics.filter((metric) => metric.isDeadStock).length;
    const excess = metrics.filter((metric) => metric.isExcess).length;
    const suggestedUnits = metrics.reduce(
      (sum, metric) => sum + (metric.approvedPurchaseQty ?? metric.suggestedPurchaseQty),
      0,
    );
    return { classA, deadStock, excess, suggestedUnits };
  }, [metrics]);

  if (!signedIn) return <LoginPanel onSignedIn={() => setSignedIn(true)} />;

  return (
    <main className="relative min-h-screen overflow-hidden bg-[#f6f8fb] text-slate-950">
      <div className="pointer-events-none absolute inset-x-0 top-0 h-72 bg-gradient-to-b from-blue-50/90 to-transparent" />
      <div className="relative mx-auto max-w-7xl px-5 py-8 sm:px-8 lg:px-10 lg:py-10">
        <header className="flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-[0.18em] text-blue-600">
              <span className="h-1.5 w-1.5 rounded-full bg-blue-600" /> Inteligência de estoque
            </div>
            <h1 className="mt-3 text-3xl font-bold tracking-[-0.035em] text-slate-950 sm:text-4xl">
              Curva ABC e sugestão de compra
            </h1>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-500">
              Classificação ABC, giro, cobertura e ruptura por produto — recalculados todo dia, com
              sugestão de compra pronta para ajuste manual antes de virar pedido.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <input
              value={branchId}
              onChange={(event) => setBranchId(event.target.value)}
              placeholder="id da filial"
              className="h-12 w-40 rounded-xl border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-800 shadow-sm outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10"
            />
            <button
              type="button"
              onClick={recalculate}
              disabled={recalculating}
              className="group flex h-12 items-center justify-center gap-2 rounded-xl bg-slate-950 px-5 text-sm font-bold text-white shadow-xl shadow-slate-950/15 transition hover:-translate-y-0.5 hover:bg-blue-600 focus:outline-none focus:ring-4 focus:ring-blue-500/20 disabled:pointer-events-none disabled:opacity-50"
            >
              <span className={recalculating ? 'animate-spin' : ''}>{icons.refresh}</span>
              {recalculating ? 'Recalculando…' : 'Recalcular agora'}
            </button>
          </div>
        </header>

        <section className="mt-8 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {[
            {
              label: 'Produtos classe A',
              value: String(summary.classA),
              detail: '80% do faturamento da filial',
              icon: icons.gauge,
              color: 'text-emerald-600 bg-emerald-50',
            },
            {
              label: 'Estoque parado',
              value: String(summary.deadStock),
              detail: 'Com saldo, zero venda em 90 dias',
              icon: icons.boxOff,
              color: 'text-rose-600 bg-rose-50',
            },
            {
              label: 'Excesso de estoque',
              value: String(summary.excess),
              detail: 'Cobertura acima do normal',
              icon: icons.layers,
              color: 'text-amber-600 bg-amber-50',
            },
            {
              label: 'Unidades sugeridas',
              value: summary.suggestedUnits.toLocaleString('pt-BR'),
              detail: 'Somando sugestão/ajuste de cada produto',
              icon: icons.cart,
              color: 'text-blue-600 bg-blue-50',
            },
          ].map((tile) => (
            <article
              key={tile.label}
              className="rounded-2xl border border-white bg-white/90 p-5 shadow-[0_8px_30px_-18px_rgba(15,23,42,.25)] backdrop-blur"
            >
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-xs font-semibold text-slate-500">{tile.label}</p>
                  <strong className="mt-2 block text-2xl font-bold tracking-tight text-slate-950">
                    {tile.value}
                  </strong>
                </div>
                <span
                  className={`flex h-10 w-10 items-center justify-center rounded-xl ${tile.color}`}
                >
                  {tile.icon}
                </span>
              </div>
              <p className="mt-3 text-xs text-slate-400">{tile.detail}</p>
            </article>
          ))}
        </section>

        <section className="mt-5 overflow-hidden rounded-3xl border border-slate-200/70 bg-white shadow-[0_18px_50px_-30px_rgba(15,23,42,.28)]">
          <div className="flex flex-wrap items-center gap-2 border-b border-slate-100 p-5">
            {FILTER_OPTIONS.map((option) => (
              <button
                key={option.key}
                type="button"
                onClick={() => setFilter(option.key)}
                className={`rounded-full px-3.5 py-1.5 text-xs font-bold transition ${
                  filter === option.key
                    ? 'bg-slate-950 text-white shadow'
                    : 'bg-slate-100 text-slate-500 hover:bg-slate-200'
                }`}
              >
                {option.label}
              </button>
            ))}
          </div>

          {error && (
            <p className="border-b border-red-100 bg-red-50 px-6 py-3 text-xs font-semibold text-red-700">
              {error}
            </p>
          )}

          <div className="overflow-x-auto">
            <table className="w-full min-w-[960px] text-left">
              <thead>
                <tr className="bg-slate-50/70 text-[10px] font-bold uppercase tracking-[0.14em] text-slate-400">
                  <th className="px-6 py-3">Produto</th>
                  <th className="px-3 py-3 text-center">ABC</th>
                  <th className="px-3 py-3 text-right">Estoque</th>
                  <th className="px-3 py-3 text-right">Giro</th>
                  <th className="px-3 py-3 text-right">Cobertura</th>
                  <th className="px-3 py-3 text-right">Rupturas</th>
                  <th className="px-6 py-3 text-right">Sugestão de compra</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {!loading && metrics.length === 0 && (
                  <tr>
                    <td colSpan={7} className="px-6 py-10 text-center text-sm text-slate-400">
                      Nenhum indicador ainda — informe a filial e clique em &ldquo;Recalcular
                      agora&rdquo;.
                    </td>
                  </tr>
                )}
                {loading && (
                  <tr>
                    <td colSpan={7} className="px-6 py-10 text-center text-sm text-slate-400">
                      Carregando…
                    </td>
                  </tr>
                )}
                {!loading &&
                  metrics.map((metric) => (
                    <tr key={metric.id} className="text-sm transition hover:bg-slate-50/80">
                      <td className="px-6 py-4">
                        <span className="block font-semibold text-slate-800">
                          {metric.productName}
                        </span>
                        <span className="mt-0.5 flex items-center gap-2 text-[11px] text-slate-400">
                          SKU {metric.sku}
                          {metric.isDeadStock && (
                            <span className="rounded-full bg-rose-50 px-1.5 py-0.5 font-bold text-rose-600">
                              parado
                            </span>
                          )}
                          {metric.isExcess && (
                            <span className="rounded-full bg-amber-50 px-1.5 py-0.5 font-bold text-amber-700">
                              excesso
                            </span>
                          )}
                        </span>
                      </td>
                      <td className="px-3 py-4">
                        <div className="flex items-center justify-center gap-1">
                          <AbcBadge value={metric.abc.byRevenue} />
                        </div>
                      </td>
                      <td className="px-3 py-4 text-right font-medium text-slate-600">
                        {metric.stockOnHand}
                      </td>
                      <td className="px-3 py-4 text-right font-medium text-slate-600">
                        {metric.turnoverRate.toFixed(1)}×
                      </td>
                      <td className="px-3 py-4 text-right font-medium text-slate-600">
                        {metric.coverageDays === null ? '—' : `${Math.round(metric.coverageDays)}d`}
                      </td>
                      <td className="px-3 py-4 text-right font-medium text-slate-600">
                        {metric.stockoutCount > 0 ? (
                          <span className="font-bold text-rose-600">{metric.stockoutCount}</span>
                        ) : (
                          '—'
                        )}
                      </td>
                      <td className="px-6 py-4">
                        <SuggestionCell
                          metric={metric}
                          branchId={branchId.trim()}
                          onAdjusted={(updated) =>
                            setMetrics((current) =>
                              current.map((item) => (item.id === updated.id ? updated : item)),
                            )
                          }
                        />
                      </td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>
        </section>

        <p className="mt-4 text-xs text-slate-400">
          Faturamento e margem são estimados pela quantidade vendida × preço/custo atual do produto
          — o histórico de preço praticado por venda ainda não é persistido.
        </p>
      </div>
    </main>
  );
}
