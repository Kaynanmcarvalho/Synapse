/* eslint-disable max-lines, max-lines-per-function */
import {
  AlertTriangle,
  ArrowDownCircle,
  ArrowUpCircle,
  Boxes,
  PackageX,
  Plus,
  Settings2,
  ShieldAlert,
} from 'lucide-react';
import { useEffect, useState } from 'react';
import {
  Button,
  Card,
  CardHeader,
  CardTitle,
  cn,
  Drawer,
  Input,
  Modal,
  Spinner,
} from '@synapse/ui';
import { devSignIn, isSignedIn } from '../../lib/dev-auth';
import {
  createLot,
  getLotBalance,
  listExpiryAlerts,
  moveStock,
  type ExpiringLot,
  type ExpiryAlertLevel,
  type LotBalance,
  type QuickMovementKind,
} from './stock.api';

const LEVEL_LABEL: Record<ExpiryAlertLevel, string> = {
  D90: '90 dias',
  D60: '60 dias',
  D30: '30 dias',
  D15: '15 dias',
  EXPIRED: 'Vencido',
};

const LEVEL_TINT: Record<ExpiryAlertLevel, string> = {
  D90: 'bg-blue-50 text-blue-700 dark:bg-blue-500/10 dark:text-blue-300',
  D60: 'bg-amber-50 text-amber-700 dark:bg-amber-500/10 dark:text-amber-300',
  D30: 'bg-orange-50 text-orange-700 dark:bg-orange-500/10 dark:text-orange-300',
  D15: 'bg-red-50 text-red-700 dark:bg-red-500/10 dark:text-red-300',
  EXPIRED: 'bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-900',
};

function LoginGate({ onSignedIn }: { readonly onSignedIn: () => void }) {
  const [email, setEmail] = useState('teste.rbac@synapse.dev');
  const [password, setPassword] = useState('Senha123!');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

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
    <main className="flex min-h-screen items-center justify-center bg-[#f6f8fb] p-8 dark:bg-slate-950">
      <Card className="w-full max-w-sm">
        <CardHeader>
          <CardTitle>Entrar (emulador local)</CardTitle>
        </CardHeader>
        <div className="flex flex-col gap-3">
          <Input value={email} onChange={(e) => setEmail(e.target.value)} placeholder="e-mail" />
          <Input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="senha"
          />
          {error && <p className="text-sm text-red-600">{error}</p>}
          <Button onClick={submit} disabled={loading}>
            {loading ? <Spinner /> : 'Entrar'}
          </Button>
        </div>
      </Card>
    </main>
  );
}

function NewLotModal({
  onClose,
  onCreated,
}: {
  readonly onClose: () => void;
  readonly onCreated: () => void;
}) {
  const [form, setForm] = useState({
    branchId: 'matriz',
    warehouseId: 'deposito-1',
    productId: '',
    manufacturedAt: '',
    expiresAt: '',
    quantity: '',
  });
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const submit = async () => {
    setError(null);
    setSaving(true);
    try {
      await createLot({ ...form, quantity: Number(form.quantity) });
      onCreated();
    } catch (cause) {
      setError((cause as Error).message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal
      onClose={onClose}
      eyebrow="Entrada de estoque"
      title="Novo lote"
      description="Registra a entrada de um lote rastreável, com fabricação e validade para o FEFO."
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>
            Cancelar
          </Button>
          <Button onClick={submit} disabled={saving || !form.productId || !form.quantity}>
            {saving ? <Spinner /> : 'Cadastrar lote'}
          </Button>
        </>
      }
    >
      <div className="grid grid-cols-2 gap-3">
        <Input
          placeholder="Filial"
          value={form.branchId}
          onChange={(e) => setForm({ ...form, branchId: e.target.value })}
        />
        <Input
          placeholder="Depósito"
          value={form.warehouseId}
          onChange={(e) => setForm({ ...form, warehouseId: e.target.value })}
        />
        <Input
          className="col-span-2"
          placeholder="Id do produto"
          value={form.productId}
          onChange={(e) => setForm({ ...form, productId: e.target.value })}
        />
        <div>
          <label
            htmlFor="new-lot-manufactured-at"
            className="mb-1.5 block text-[11px] font-bold uppercase tracking-[0.14em] text-slate-500 dark:text-slate-400"
          >
            Fabricação
          </label>
          <Input
            id="new-lot-manufactured-at"
            type="date"
            value={form.manufacturedAt}
            onChange={(e) => setForm({ ...form, manufacturedAt: e.target.value })}
          />
        </div>
        <div>
          <label
            htmlFor="new-lot-expires-at"
            className="mb-1.5 block text-[11px] font-bold uppercase tracking-[0.14em] text-slate-500 dark:text-slate-400"
          >
            Validade
          </label>
          <Input
            id="new-lot-expires-at"
            type="date"
            value={form.expiresAt}
            onChange={(e) => setForm({ ...form, expiresAt: e.target.value })}
          />
        </div>
        <Input
          className="col-span-2"
          type="number"
          placeholder="Quantidade"
          value={form.quantity}
          onChange={(e) => setForm({ ...form, quantity: e.target.value })}
        />
      </div>
      {error && <p className="mt-3 text-sm text-red-600">{error}</p>}
    </Modal>
  );
}

const KIND_OPTIONS: ReadonlyArray<{
  value: QuickMovementKind;
  label: string;
  description: string;
  icon: typeof ArrowUpCircle;
  tint: string;
}> = [
  {
    value: 'INBOUND',
    label: 'Entrada',
    description: 'Recebimento fora de compra ou transferência.',
    icon: ArrowUpCircle,
    tint: 'text-emerald-600',
  },
  {
    value: 'OUTBOUND',
    label: 'Saída',
    description: 'Baixa manual, perda, quebra ou descarte.',
    icon: ArrowDownCircle,
    tint: 'text-rose-600',
  },
  {
    value: 'ADJUSTMENT',
    label: 'Ajuste',
    description: 'Correção pontual de saldo após conferência.',
    icon: Settings2,
    tint: 'text-blue-600',
  },
];

function QuickAdjustDrawer({
  onClose,
  onAdjusted,
}: {
  readonly onClose: () => void;
  readonly onAdjusted: () => void;
}) {
  const [kind, setKind] = useState<QuickMovementKind>('ADJUSTMENT');
  const [form, setForm] = useState({
    branchId: 'matriz',
    warehouseId: 'deposito-1',
    productId: '',
    quantity: '',
    reason: '',
  });
  const [allowNegative, setAllowNegative] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const submit = async () => {
    setError(null);
    setSaving(true);
    try {
      await moveStock(kind, {
        branchId: form.branchId,
        warehouseId: form.warehouseId,
        productId: form.productId,
        quantity: Number(form.quantity),
        reason: form.reason,
        allowNegative,
      });
      onAdjusted();
    } catch (cause) {
      setError((cause as Error).message);
    } finally {
      setSaving(false);
    }
  };

  const invalid = !form.productId || !form.quantity || form.reason.trim().length < 3;

  return (
    <Drawer
      onClose={onClose}
      eyebrow="Movimentação manual"
      title="Ajuste rápido de saldo"
      description="Fora do fluxo de venda ou transferência — cada ajuste fica registrado com motivo e responsável."
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>
            Cancelar
          </Button>
          <Button onClick={submit} disabled={saving || invalid}>
            {saving ? <Spinner /> : 'Confirmar movimento'}
          </Button>
        </>
      }
    >
      <div className="grid grid-cols-3 gap-2">
        {KIND_OPTIONS.map((option) => {
          const selected = kind === option.value;
          return (
            <button
              key={option.value}
              type="button"
              onClick={() => setKind(option.value)}
              className={cn(
                'flex flex-col items-center gap-2 rounded-xl border p-3 text-center transition',
                selected
                  ? 'border-blue-500 bg-blue-50/70 dark:bg-blue-500/10'
                  : 'border-slate-200 hover:border-slate-300 dark:border-slate-700',
              )}
            >
              <option.icon size={20} className={option.tint} />
              <span className="text-xs font-bold text-slate-800 dark:text-slate-200">
                {option.label}
              </span>
            </button>
          );
        })}
      </div>
      <p className="mt-2 text-xs leading-5 text-slate-500 dark:text-slate-400">
        {KIND_OPTIONS.find((option) => option.value === kind)?.description}
      </p>

      <div className="mt-5 grid grid-cols-2 gap-3">
        <Input
          placeholder="Filial"
          value={form.branchId}
          onChange={(e) => setForm({ ...form, branchId: e.target.value })}
        />
        <Input
          placeholder="Depósito"
          value={form.warehouseId}
          onChange={(e) => setForm({ ...form, warehouseId: e.target.value })}
        />
        <Input
          className="col-span-2"
          placeholder="Id do produto"
          value={form.productId}
          onChange={(e) => setForm({ ...form, productId: e.target.value })}
        />
        <Input
          type="number"
          placeholder="Quantidade"
          value={form.quantity}
          onChange={(e) => setForm({ ...form, quantity: e.target.value })}
        />
        <label className="flex items-center gap-2 text-xs font-semibold text-slate-600 dark:text-slate-300">
          <input
            type="checkbox"
            checked={allowNegative}
            onChange={(e) => setAllowNegative(e.target.checked)}
            className="h-4 w-4 rounded border-slate-300 dark:border-slate-600"
          />
          Permitir saldo negativo
        </label>
      </div>

      <label className="mt-3 block">
        <span className="mb-1.5 block text-[11px] font-bold uppercase tracking-[0.14em] text-slate-500 dark:text-slate-400">
          Motivo
        </span>
        <textarea
          rows={2}
          value={form.reason}
          onChange={(e) => setForm({ ...form, reason: e.target.value })}
          placeholder="Ex.: avaria no transporte, contagem cega, doação"
          className="w-full resize-none rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-800 outline-none transition placeholder:text-slate-400 focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200"
        />
      </label>
      {error && <p className="mt-3 text-sm text-red-600">{error}</p>}
    </Drawer>
  );
}

function LotDetailDrawer({
  alert,
  onClose,
}: {
  readonly alert: ExpiringLot;
  readonly onClose: () => void;
}) {
  const { lot, daysUntilExpiry, alertLevel } = alert;
  const [balance, setBalance] = useState<LotBalance | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    setLoading(true);
    getLotBalance(lot.branchId, lot.warehouseId, lot.productId)
      .then((result) => {
        if (active) setBalance(result);
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [lot.branchId, lot.warehouseId, lot.productId]);

  return (
    <Drawer
      onClose={onClose}
      eyebrow={`${lot.branchId} / ${lot.warehouseId}`}
      title={lot.productId}
      description={`Lote ${lot.id.slice(0, 8)}`}
    >
      <div className="flex items-center justify-between rounded-2xl bg-slate-950 p-5 text-white">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.14em] text-slate-400">Vencimento</p>
          <p className="mt-1 text-lg font-semibold">
            {alertLevel === 'EXPIRED'
              ? `Vencido há ${Math.abs(daysUntilExpiry)} dias`
              : `Em ${daysUntilExpiry} dias`}
          </p>
        </div>
        <span className={`rounded-full px-3 py-1 text-[11px] font-bold ${LEVEL_TINT[alertLevel]}`}>
          {LEVEL_LABEL[alertLevel]}
        </span>
      </div>

      {loading ? (
        <div className="mt-6 flex justify-center">
          <Spinner />
        </div>
      ) : (
        balance && (
          <div className="mt-6 grid grid-cols-3 gap-px overflow-hidden rounded-2xl bg-slate-100 dark:bg-slate-800">
            {(
              [
                ['Físico', balance.physical],
                ['Reservado', balance.reserved],
                ['Disponível', balance.available],
              ] as const
            ).map(([label, value]) => (
              <div key={label} className="bg-white p-4 dark:bg-slate-900">
                <span className="block text-[10px] font-bold uppercase tracking-[0.14em] text-slate-400">
                  {label}
                </span>
                <span className="mt-1 block text-xl font-bold text-slate-950 dark:text-slate-100">
                  {value}
                </span>
              </div>
            ))}
          </div>
        )
      )}

      <dl className="mt-6 space-y-3 text-sm">
        <div className="flex justify-between border-b border-slate-100 pb-3 dark:border-slate-800">
          <dt className="text-slate-500 dark:text-slate-400">Fabricação</dt>
          <dd className="font-semibold text-slate-800 dark:text-slate-200">{lot.manufacturedAt}</dd>
        </div>
        <div className="flex justify-between border-b border-slate-100 pb-3 dark:border-slate-800">
          <dt className="text-slate-500 dark:text-slate-400">Validade</dt>
          <dd className="font-semibold text-slate-800 dark:text-slate-200">{lot.expiresAt}</dd>
        </div>
        <div className="flex justify-between">
          <dt className="text-slate-500 dark:text-slate-400">Quantidade inicial</dt>
          <dd className="font-semibold text-slate-800 dark:text-slate-200">
            {lot.initialQuantity}
          </dd>
        </div>
      </dl>
    </Drawer>
  );
}

function AlertSummary({
  alerts,
  className,
}: {
  readonly alerts: readonly ExpiringLot[];
  readonly className?: string;
}) {
  const expired = alerts.filter((a) => a.alertLevel === 'EXPIRED').length;
  const critical = alerts.filter((a) => a.alertLevel === 'D15').length;
  const total = alerts.length;

  const tiles = [
    {
      label: 'Lotes monitorados',
      value: total,
      detail: 'Janela de 90 dias',
      icon: Boxes,
      tint: 'bg-blue-50 text-blue-600 dark:bg-blue-500/10 dark:text-blue-300',
    },
    {
      label: 'Vencidos',
      value: expired,
      detail: 'Requer baixa ou descarte',
      icon: PackageX,
      tint: 'bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-900',
    },
    {
      label: 'Críticos (≤15 dias)',
      value: critical,
      detail: 'Priorizar saída FEFO',
      icon: ShieldAlert,
      tint: 'bg-red-50 text-red-600 dark:bg-red-500/10 dark:text-red-300',
    },
  ];

  return (
    <section className={cn('grid gap-4 sm:grid-cols-3', className)}>
      {tiles.map((tile) => (
        <article
          key={tile.label}
          className="rounded-2xl border border-white bg-white/90 p-5 shadow-[0_8px_30px_-18px_rgba(15,23,42,.25)] backdrop-blur dark:border-slate-800 dark:bg-slate-900/90"
        >
          <div className="flex items-start justify-between">
            <p className="text-xs font-semibold text-slate-500 dark:text-slate-400">{tile.label}</p>
            <span className={`flex h-10 w-10 items-center justify-center rounded-xl ${tile.tint}`}>
              <tile.icon size={19} />
            </span>
          </div>
          <strong className="mt-5 block text-2xl font-bold tracking-tight text-slate-950 dark:text-slate-100">
            {tile.value}
          </strong>
          <p className="mt-3 text-xs text-slate-400">{tile.detail}</p>
        </article>
      ))}
    </section>
  );
}

function ExpiryTable({
  alerts,
  onSelect,
}: {
  readonly alerts: readonly ExpiringLot[];
  readonly onSelect: (alert: ExpiringLot) => void;
}) {
  if (alerts.length === 0) {
    return (
      <p className="px-6 py-10 text-center text-sm text-slate-500 dark:text-slate-400">
        Nenhum lote dentro da janela de alerta (90 dias).
      </p>
    );
  }
  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[680px] text-left">
        <thead>
          <tr className="bg-slate-50/70 text-[10px] font-bold uppercase tracking-[0.14em] text-slate-400 dark:bg-slate-800/40">
            <th className="px-6 py-3">Produto</th>
            <th className="px-4 py-3">Depósito</th>
            <th className="px-4 py-3 text-right">Saldo</th>
            <th className="px-4 py-3 text-right">Vence em</th>
            <th className="px-6 py-3 text-center">Alerta</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
          {alerts.map((alert) => {
            const { lot, daysUntilExpiry, alertLevel } = alert;
            return (
              <tr
                key={lot.id}
                tabIndex={0}
                onClick={() => onSelect(alert)}
                onKeyDown={(event) => {
                  if (event.key === 'Enter') onSelect(alert);
                }}
                className="cursor-pointer text-sm outline-none transition hover:bg-slate-50/80 focus-visible:bg-blue-50/60 dark:hover:bg-slate-800/60"
              >
                <td className="px-6 py-4">
                  <span className="block font-semibold text-slate-800 dark:text-slate-200">
                    {lot.productId}
                  </span>
                  <span className="mt-0.5 block text-[11px] text-slate-400">
                    Lote {lot.id.slice(0, 8)}
                  </span>
                </td>
                <td className="px-4 py-4 text-slate-500 dark:text-slate-400">
                  {lot.branchId} / {lot.warehouseId}
                </td>
                <td className="px-4 py-4 text-right font-bold text-slate-800 dark:text-slate-200">
                  {lot.physical - lot.reserved}
                </td>
                <td className="px-4 py-4 text-right text-slate-500 dark:text-slate-400">
                  {alertLevel === 'EXPIRED' ? (
                    <span className="flex items-center justify-end gap-1 text-red-700 dark:text-red-400">
                      <AlertTriangle size={14} /> há {Math.abs(daysUntilExpiry)} dias
                    </span>
                  ) : (
                    `${daysUntilExpiry} dias`
                  )}
                </td>
                <td className="px-6 py-4 text-center">
                  <span
                    className={`rounded-full px-2.5 py-1 text-[11px] font-bold ${LEVEL_TINT[alertLevel]}`}
                  >
                    {LEVEL_LABEL[alertLevel]}
                  </span>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

type StockModal = 'none' | 'new-lot' | 'adjust';

export function StockScreen() {
  const [signedIn, setSignedIn] = useState(false);
  const [alerts, setAlerts] = useState<ExpiringLot[]>([]);
  const [loading, setLoading] = useState(false);
  const [modal, setModal] = useState<StockModal>('none');
  const [selected, setSelected] = useState<ExpiringLot | null>(null);

  const refresh = async () => {
    setLoading(true);
    try {
      setAlerts(await listExpiryAlerts());
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => setSignedIn(isSignedIn()), []);
  useEffect(() => {
    if (signedIn) void refresh();
  }, [signedIn]);

  if (!signedIn) return <LoginGate onSignedIn={() => setSignedIn(true)} />;

  return (
    <main className="relative min-h-screen overflow-hidden bg-[#f6f8fb] text-slate-950 dark:bg-slate-950 dark:text-slate-100">
      <div className="pointer-events-none absolute inset-x-0 top-0 h-72 bg-gradient-to-b from-blue-50/90 to-transparent" />
      <div className="relative mx-auto max-w-6xl px-5 py-8 sm:px-8 lg:px-10 lg:py-10">
        <header className="flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-[0.18em] text-blue-600">
              <span className="h-1.5 w-1.5 rounded-full bg-blue-600" /> Controle de estoque
            </div>
            <h1 className="mt-3 text-3xl font-bold tracking-[-0.035em] text-slate-950 sm:text-4xl dark:text-slate-100">
              Estoque
            </h1>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-500 dark:text-slate-400">
              Lotes, validade e FEFO (§8) — a base do PDV e da separação.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setModal('adjust')}
              className="flex h-12 items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 text-sm font-bold text-slate-700 shadow-sm transition hover:-translate-y-0.5 hover:border-blue-200 hover:bg-blue-50 hover:text-blue-700 focus:outline-none focus:ring-4 focus:ring-blue-500/20 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200"
            >
              <Settings2 size={17} /> Ajuste rápido
            </button>
            <button
              type="button"
              onClick={() => setModal('new-lot')}
              className="flex h-12 items-center justify-center gap-2 rounded-xl bg-slate-950 px-5 text-sm font-bold text-white shadow-xl shadow-slate-950/15 transition hover:-translate-y-0.5 hover:bg-blue-600 focus:outline-none focus:ring-4 focus:ring-blue-500/20"
            >
              <Plus size={17} /> Novo lote
            </button>
          </div>
        </header>

        <AlertSummary alerts={alerts} className="mt-8" />

        <section className="mt-5 overflow-hidden rounded-3xl border border-slate-200/70 bg-white shadow-[0_18px_50px_-30px_rgba(15,23,42,.28)] dark:bg-slate-900">
          <div className="flex items-center justify-between border-b border-slate-100 px-6 py-5 dark:border-slate-800">
            <div>
              <h2 className="font-bold text-slate-950 dark:text-slate-100">
                Produtos próximos do vencimento
              </h2>
              <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                Janela de alerta de 90 dias, priorizando FEFO — clique num lote para ver o detalhe
              </p>
            </div>
          </div>
          {loading ? (
            <div className="flex justify-center py-14">
              <Spinner />
            </div>
          ) : (
            <ExpiryTable alerts={alerts} onSelect={setSelected} />
          )}
        </section>
      </div>

      {modal === 'new-lot' && (
        <NewLotModal
          onClose={() => setModal('none')}
          onCreated={() => {
            setModal('none');
            void refresh();
          }}
        />
      )}
      {modal === 'adjust' && (
        <QuickAdjustDrawer
          onClose={() => setModal('none')}
          onAdjusted={() => {
            setModal('none');
            void refresh();
          }}
        />
      )}
      {selected && <LotDetailDrawer alert={selected} onClose={() => setSelected(null)} />}
    </main>
  );
}
