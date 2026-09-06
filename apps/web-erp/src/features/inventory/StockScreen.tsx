import { AlertTriangle, Boxes, PackageX, ShieldAlert } from 'lucide-react';
import { useEffect, useState } from 'react';
import { Button, Card, CardHeader, CardTitle, Input, Spinner } from '@synapse/ui';
import { devSignIn, isSignedIn } from '../../lib/dev-auth';
import { createLot, listExpiryAlerts, type ExpiringLot, type ExpiryAlertLevel } from './stock.api';

const LEVEL_LABEL: Record<ExpiryAlertLevel, string> = {
  D90: '90 dias',
  D60: '60 dias',
  D30: '30 dias',
  D15: '15 dias',
  EXPIRED: 'Vencido',
};

const LEVEL_TINT: Record<ExpiryAlertLevel, string> = {
  D90: 'bg-blue-50 text-blue-700',
  D60: 'bg-amber-50 text-amber-700',
  D30: 'bg-orange-50 text-orange-700',
  D15: 'bg-red-50 text-red-700',
  EXPIRED: 'bg-slate-900 text-white',
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
    <main className="flex min-h-[60vh] items-center justify-center p-8">
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

function NewLotForm({ onCreated }: { readonly onCreated: () => void }) {
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
      setForm({ ...form, productId: '', manufacturedAt: '', expiresAt: '', quantity: '' });
      onCreated();
    } catch (cause) {
      setError((cause as Error).message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Novo lote</CardTitle>
      </CardHeader>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
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
          placeholder="Id do produto"
          value={form.productId}
          onChange={(e) => setForm({ ...form, productId: e.target.value })}
        />
        <Input
          type="date"
          placeholder="Fabricação"
          value={form.manufacturedAt}
          onChange={(e) => setForm({ ...form, manufacturedAt: e.target.value })}
        />
        <Input
          type="date"
          placeholder="Validade"
          value={form.expiresAt}
          onChange={(e) => setForm({ ...form, expiresAt: e.target.value })}
        />
        <Input
          type="number"
          placeholder="Quantidade"
          value={form.quantity}
          onChange={(e) => setForm({ ...form, quantity: e.target.value })}
        />
      </div>
      {error && <p className="mt-2 text-sm text-red-600">{error}</p>}
      <Button className="mt-3" onClick={submit} disabled={saving}>
        {saving ? <Spinner /> : 'Cadastrar lote'}
      </Button>
    </Card>
  );
}

function AlertSummary({ alerts }: { readonly alerts: readonly ExpiringLot[] }) {
  const expired = alerts.filter((a) => a.alertLevel === 'EXPIRED').length;
  const critical = alerts.filter((a) => a.alertLevel === 'D15').length;
  const total = alerts.length;

  const tiles = [
    { label: 'Lotes monitorados', value: total, icon: Boxes, tint: 'bg-slate-100 text-slate-700' },
    { label: 'Vencidos', value: expired, icon: PackageX, tint: 'bg-slate-900 text-white' },
    {
      label: 'Críticos (≤15 dias)',
      value: critical,
      icon: ShieldAlert,
      tint: 'bg-red-50 text-red-700',
    },
  ];

  return (
    <section className="grid gap-4 sm:grid-cols-3">
      {tiles.map((tile) => (
        <article
          key={tile.label}
          className="rounded-2xl border border-slate-200/70 bg-white p-5 shadow-[0_10px_35px_-24px_rgba(15,23,42,.3)]"
        >
          <div className="flex items-start justify-between">
            <p className="text-xs font-semibold text-slate-500">{tile.label}</p>
            <span className={`flex h-10 w-10 items-center justify-center rounded-xl ${tile.tint}`}>
              <tile.icon size={19} />
            </span>
          </div>
          <strong className="mt-5 block text-2xl font-bold tracking-[-0.03em] text-slate-950">
            {tile.value}
          </strong>
        </article>
      ))}
    </section>
  );
}

export function StockScreen() {
  const [signedIn, setSignedIn] = useState(false);
  const [alerts, setAlerts] = useState<ExpiringLot[]>([]);
  const [loading, setLoading] = useState(false);

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
    <main className="mx-auto flex max-w-5xl flex-col gap-6 p-8">
      <header>
        <h1 className="text-2xl font-bold text-slate-950">Estoque</h1>
        <p className="text-sm text-slate-500">
          Lotes, validade e FEFO (§8) — a base do PDV e da separação.
        </p>
      </header>

      <NewLotForm onCreated={refresh} />

      <AlertSummary alerts={alerts} />

      <Card>
        <CardHeader>
          <CardTitle>Produtos próximos do vencimento</CardTitle>
        </CardHeader>
        {loading ? <Spinner /> : <ExpiryTable alerts={alerts} />}
      </Card>
    </main>
  );
}

function ExpiryTable({ alerts }: { readonly alerts: readonly ExpiringLot[] }) {
  if (alerts.length === 0) {
    return (
      <p className="text-sm text-slate-500">Nenhum lote dentro da janela de alerta (90 dias).</p>
    );
  }
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-left text-sm">
        <thead>
          <tr className="text-xs uppercase tracking-wide text-slate-400">
            <th className="py-2 pr-4">Produto</th>
            <th className="py-2 pr-4">Lote</th>
            <th className="py-2 pr-4">Depósito</th>
            <th className="py-2 pr-4">Saldo</th>
            <th className="py-2 pr-4">Vence em</th>
            <th className="py-2">Alerta</th>
          </tr>
        </thead>
        <tbody>
          {alerts.map(({ lot, daysUntilExpiry, alertLevel }) => (
            <tr key={lot.id} className="border-t border-slate-100">
              <td className="py-2 pr-4 font-mono text-xs">{lot.productId}</td>
              <td className="py-2 pr-4 font-mono text-xs">{lot.id.slice(0, 8)}</td>
              <td className="py-2 pr-4">
                {lot.branchId} / {lot.warehouseId}
              </td>
              <td className="py-2 pr-4">{lot.physical - lot.reserved}</td>
              <td className="py-2 pr-4">
                {alertLevel === 'EXPIRED' ? (
                  <span className="flex items-center gap-1 text-red-700">
                    <AlertTriangle size={14} /> há {Math.abs(daysUntilExpiry)} dias
                  </span>
                ) : (
                  `${daysUntilExpiry} dias`
                )}
              </td>
              <td className="py-2">
                <span
                  className={`rounded-full px-2.5 py-1 text-[11px] font-bold ${LEVEL_TINT[alertLevel]}`}
                >
                  {LEVEL_LABEL[alertLevel]}
                </span>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
