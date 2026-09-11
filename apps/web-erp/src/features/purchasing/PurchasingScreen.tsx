/* eslint-disable max-lines, max-lines-per-function */
import { useEffect, useMemo, useState } from 'react';
import {
  addQuote,
  createPurchaseOrder,
  devSignIn,
  isSignedIn,
  listPurchaseOrders,
  receiveFromXml,
  receiveManual,
  selectSupplier,
  type PurchaseOrder,
} from './purchasing.api';

const money = (centavos: number) =>
  new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(centavos / 100);

const STATUS_LABEL: Record<PurchaseOrder['status'], string> = {
  RASCUNHO: 'Rascunho',
  EM_COTACAO: 'Em cotação',
  APROVADO: 'Aprovado',
  RECEBIDO_PARCIAL: 'Recebido parcial',
  RECEBIDO: 'Recebido',
  CANCELADO: 'Cancelado',
};

const STATUS_STYLE: Record<PurchaseOrder['status'], string> = {
  RASCUNHO: 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300',
  EM_COTACAO: 'bg-amber-50 text-amber-700',
  APROVADO: 'bg-blue-50 text-blue-700',
  RECEBIDO_PARCIAL: 'bg-violet-50 text-violet-700',
  RECEBIDO: 'bg-emerald-50 text-emerald-700',
  CANCELADO: 'bg-rose-50 text-rose-700',
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
    <main className="flex min-h-screen items-center justify-center bg-[#f6f8fb] p-8 dark:bg-slate-950">
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

interface ItemRow {
  productId: string;
  quantityOrdered: string;
}

function NewOrderForm({
  branchId,
  onCreated,
}: {
  readonly branchId: string;
  readonly onCreated: () => void;
}) {
  const [warehouseId, setWarehouseId] = useState('wh-central');
  const [rows, setRows] = useState<ItemRow[]>([{ productId: '', quantityOrdered: '' }]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const setRow = (index: number, patch: Partial<ItemRow>) =>
    setRows((current) => current.map((row, i) => (i === index ? { ...row, ...patch } : row)));

  const submit = async () => {
    setError(null);
    const items = rows
      .filter((row) => row.productId.trim() && Number(row.quantityOrdered) > 0)
      .map((row) => ({
        productId: row.productId.trim(),
        quantityOrdered: Math.round(Number(row.quantityOrdered)),
      }));
    if (items.length === 0) {
      setError('Informe ao menos um produto com quantidade');
      return;
    }
    setSaving(true);
    try {
      await createPurchaseOrder({ branchId, warehouseId, items });
      setRows([{ productId: '', quantityOrdered: '' }]);
      onCreated();
    } catch (cause) {
      setError((cause as Error).message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 dark:border-slate-700 dark:bg-slate-900">
      <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">
        Novo pedido de compra
      </h3>
      <div className="mt-3 flex items-center gap-2">
        <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">Depósito</span>
        <input
          value={warehouseId}
          onChange={(event) => setWarehouseId(event.target.value)}
          className="h-9 flex-1 rounded-lg border border-slate-200 px-3 text-sm outline-none focus:border-blue-500 dark:border-slate-700"
        />
      </div>
      <div className="mt-3 space-y-2">
        {rows.map((row, index) => (
          <div key={index} className="flex items-center gap-2">
            <input
              value={row.productId}
              onChange={(event) => setRow(index, { productId: event.target.value })}
              placeholder="id do produto"
              className="h-9 flex-1 rounded-lg border border-slate-200 px-3 text-sm outline-none focus:border-blue-500 dark:border-slate-700"
            />
            <input
              value={row.quantityOrdered}
              onChange={(event) => setRow(index, { quantityOrdered: event.target.value })}
              placeholder="quantidade"
              type="number"
              min={1}
              className="h-9 w-32 rounded-lg border border-slate-200 px-3 text-sm outline-none focus:border-blue-500 dark:border-slate-700"
            />
          </div>
        ))}
      </div>
      <div className="mt-3 flex items-center justify-between">
        <button
          type="button"
          onClick={() => setRows((current) => [...current, { productId: '', quantityOrdered: '' }])}
          className="text-xs font-bold text-blue-600 hover:text-blue-800"
        >
          + adicionar item
        </button>
        <button
          type="button"
          onClick={submit}
          disabled={saving}
          className="h-9 rounded-lg bg-slate-950 px-4 text-xs font-bold text-white transition hover:bg-blue-600 disabled:opacity-50"
        >
          {saving ? 'Criando…' : 'Criar pedido'}
        </button>
      </div>
      {error && <p className="mt-2 text-xs text-red-600">{error}</p>}
    </div>
  );
}

interface QuoteRow {
  productId: string;
  unitCost: string;
}

function OrderDetail({
  order,
  onChanged,
}: {
  readonly order: PurchaseOrder;
  readonly onChanged: () => void;
}) {
  const [supplierId, setSupplierId] = useState('');
  const [leadDays, setLeadDays] = useState('5');
  const [quoteRows, setQuoteRows] = useState<QuoteRow[]>(
    order.items.map((item) => ({ productId: item.productId, unitCost: '' })),
  );
  const [receivingLines, setReceivingLines] = useState<
    Record<string, { qty: string; cost: string }>
  >({});
  const [xml, setXml] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [tab, setTab] = useState<'manual' | 'xml'>('manual');

  useEffect(() => {
    setQuoteRows(order.items.map((item) => ({ productId: item.productId, unitCost: '' })));
  }, [order.id, order.items]);

  const totals = useMemo(
    () =>
      order.quotes.map((quote) => ({
        supplierId: quote.supplierId,
        leadDays: quote.leadDays,
        total: order.items.reduce((sum, item) => {
          const q = quote.items.find((candidate) => candidate.productId === item.productId);
          return sum + (q?.unitCostCentavos ?? 0) * item.quantityOrdered;
        }, 0),
      })),
    [order],
  );

  const submitQuote = async () => {
    setError(null);
    if (!supplierId.trim()) {
      setError('Informe o id do fornecedor');
      return;
    }
    setBusy(true);
    try {
      await addQuote(order.id, {
        supplierId: supplierId.trim(),
        leadDays: Math.round(Number(leadDays)) || 1,
        items: quoteRows.map((row) => ({
          productId: row.productId,
          unitCostCentavos: Math.round(Number(row.unitCost) * 100) || 0,
        })),
      });
      setSupplierId('');
      onChanged();
    } catch (cause) {
      setError((cause as Error).message);
    } finally {
      setBusy(false);
    }
  };

  const approve = async (winnerId: string) => {
    setBusy(true);
    setError(null);
    try {
      await selectSupplier(order.id, winnerId);
      onChanged();
    } catch (cause) {
      setError((cause as Error).message);
    } finally {
      setBusy(false);
    }
  };

  const submitManualReceiving = async () => {
    setBusy(true);
    setError(null);
    try {
      const lines = order.items
        .map((item) => {
          const entry = receivingLines[item.productId];
          const qty = Number(entry?.qty ?? 0);
          if (qty <= 0) return null;
          return {
            productId: item.productId,
            quantityReceived: Math.round(qty),
            unitCostReceived: Math.round(Number(entry?.cost ?? 0) * 100),
          };
        })
        .filter((line): line is NonNullable<typeof line> => line !== null);
      if (lines.length === 0) {
        setError('Informe a quantidade recebida de ao menos um item');
        return;
      }
      await receiveManual(order.id, { warehouseId: order.warehouseId, lines });
      setReceivingLines({});
      onChanged();
    } catch (cause) {
      setError((cause as Error).message);
    } finally {
      setBusy(false);
    }
  };

  const submitXmlReceiving = async () => {
    setBusy(true);
    setError(null);
    try {
      await receiveFromXml(order.id, order.warehouseId, xml);
      setXml('');
      onChanged();
    } catch (cause) {
      setError((cause as Error).message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 dark:border-slate-700 dark:bg-slate-900">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">
          Pedido {order.id.slice(0, 8)}
        </h3>
        <span
          className={`rounded-full px-2.5 py-1 text-[10px] font-bold ${STATUS_STYLE[order.status]}`}
        >
          {STATUS_LABEL[order.status]}
        </span>
      </div>

      <table className="mt-3 w-full text-left text-xs">
        <thead>
          <tr className="text-slate-400">
            <th className="py-1 font-semibold">Produto</th>
            <th className="py-1 text-right font-semibold">Pedido</th>
            <th className="py-1 text-right font-semibold">Recebido</th>
            <th className="py-1 text-right font-semibold">Custo</th>
          </tr>
        </thead>
        <tbody>
          {order.items.map((item) => (
            <tr key={item.productId} className="border-t border-slate-100">
              <td className="py-1.5 font-medium text-slate-700 dark:text-slate-300">
                {item.productId}
              </td>
              <td className="py-1.5 text-right text-slate-600 dark:text-slate-300">
                {item.quantityOrdered}
              </td>
              <td className="py-1.5 text-right text-slate-600 dark:text-slate-300">
                {item.quantityReceived}
              </td>
              <td className="py-1.5 text-right text-slate-600 dark:text-slate-300">
                {item.unitCostCentavos > 0 ? money(item.unitCostCentavos) : '—'}
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      {(order.status === 'RASCUNHO' || order.status === 'EM_COTACAO') && (
        <div className="mt-5 rounded-xl bg-slate-50 p-4 dark:bg-slate-950">
          <p className="text-xs font-bold uppercase tracking-wide text-slate-500 dark:text-slate-400">
            Cotações ({order.quotes.length})
          </p>
          {totals.length > 0 && (
            <ul className="mt-2 space-y-1.5">
              {totals
                .sort((a, b) => a.total - b.total)
                .map((quote) => (
                  <li
                    key={quote.supplierId}
                    className="flex items-center justify-between rounded-lg bg-white px-3 py-2 text-xs dark:bg-slate-900"
                  >
                    <span className="font-semibold text-slate-700 dark:text-slate-300">
                      {quote.supplierId} · {quote.leadDays}d
                    </span>
                    <span className="flex items-center gap-2">
                      <strong className="text-slate-900 dark:text-slate-100">
                        {money(quote.total)}
                      </strong>
                      <button
                        type="button"
                        disabled={busy || order.quotes.length < 2}
                        onClick={() => approve(quote.supplierId)}
                        className="rounded-md bg-slate-950 px-2 py-1 text-[10px] font-bold text-white transition hover:bg-blue-600 disabled:opacity-40"
                      >
                        Aprovar
                      </button>
                    </span>
                  </li>
                ))}
            </ul>
          )}
          {order.quotes.length < 2 && (
            <p className="mt-2 text-[11px] text-amber-700">
              Precisa de pelo menos duas cotações para aprovar (§40).
            </p>
          )}

          <div className="mt-3 grid grid-cols-2 gap-2">
            <input
              value={supplierId}
              onChange={(event) => setSupplierId(event.target.value)}
              placeholder="id do fornecedor"
              className="h-9 rounded-lg border border-slate-200 px-3 text-xs outline-none focus:border-blue-500 dark:border-slate-700"
            />
            <input
              value={leadDays}
              onChange={(event) => setLeadDays(event.target.value)}
              placeholder="lead time (dias)"
              type="number"
              className="h-9 rounded-lg border border-slate-200 px-3 text-xs outline-none focus:border-blue-500 dark:border-slate-700"
            />
          </div>
          <div className="mt-2 space-y-1.5">
            {quoteRows.map((row, index) => (
              <div key={row.productId} className="flex items-center gap-2">
                <span className="w-32 truncate text-[11px] text-slate-500 dark:text-slate-400">
                  {row.productId}
                </span>
                <input
                  value={row.unitCost}
                  onChange={(event) =>
                    setQuoteRows((current) =>
                      current.map((item, i) =>
                        i === index ? { ...item, unitCost: event.target.value } : item,
                      ),
                    )
                  }
                  placeholder="preço unitário (R$)"
                  type="number"
                  className="h-8 flex-1 rounded-lg border border-slate-200 px-2 text-xs outline-none focus:border-blue-500 dark:border-slate-700"
                />
              </div>
            ))}
          </div>
          <button
            type="button"
            onClick={submitQuote}
            disabled={busy}
            className="mt-3 h-9 w-full rounded-lg bg-white text-xs font-bold text-blue-600 ring-1 ring-inset ring-blue-200 transition hover:bg-blue-50 disabled:opacity-50 dark:bg-slate-900"
          >
            Enviar cotação
          </button>
        </div>
      )}

      {(order.status === 'APROVADO' || order.status === 'RECEBIDO_PARCIAL') && (
        <div className="mt-5 rounded-xl bg-slate-50 p-4 dark:bg-slate-950">
          <div className="flex gap-1.5 text-[11px] font-bold">
            <button
              type="button"
              onClick={() => setTab('manual')}
              className={`rounded-full px-3 py-1 ${tab === 'manual' ? 'bg-slate-950 text-white' : 'bg-white text-slate-500 dark:bg-slate-900 dark:text-slate-400'}`}
            >
              Conferência manual
            </button>
            <button
              type="button"
              onClick={() => setTab('xml')}
              className={`rounded-full px-3 py-1 ${tab === 'xml' ? 'bg-slate-950 text-white' : 'bg-white text-slate-500 dark:bg-slate-900 dark:text-slate-400'}`}
            >
              Entrada por XML (DF-e)
            </button>
          </div>

          {tab === 'manual' ? (
            <div className="mt-3 space-y-1.5">
              {order.items
                .filter((item) => item.quantityReceived < item.quantityOrdered)
                .map((item) => (
                  <div key={item.productId} className="flex items-center gap-2">
                    <span className="w-32 truncate text-[11px] text-slate-500 dark:text-slate-400">
                      {item.productId}
                    </span>
                    <input
                      value={receivingLines[item.productId]?.qty ?? ''}
                      onChange={(event) =>
                        setReceivingLines((current) => ({
                          ...current,
                          [item.productId]: {
                            ...current[item.productId],
                            qty: event.target.value,
                            cost: current[item.productId]?.cost ?? '',
                          },
                        }))
                      }
                      placeholder="qtd recebida"
                      type="number"
                      className="h-8 w-28 rounded-lg border border-slate-200 px-2 text-xs outline-none focus:border-blue-500 dark:border-slate-700"
                    />
                    <input
                      value={receivingLines[item.productId]?.cost ?? ''}
                      onChange={(event) =>
                        setReceivingLines((current) => ({
                          ...current,
                          [item.productId]: {
                            ...current[item.productId],
                            cost: event.target.value,
                            qty: current[item.productId]?.qty ?? '',
                          },
                        }))
                      }
                      placeholder="custo unit. (R$)"
                      type="number"
                      className="h-8 w-32 rounded-lg border border-slate-200 px-2 text-xs outline-none focus:border-blue-500 dark:border-slate-700"
                    />
                  </div>
                ))}
              <button
                type="button"
                onClick={submitManualReceiving}
                disabled={busy}
                className="mt-2 h-9 w-full rounded-lg bg-emerald-600 text-xs font-bold text-white transition hover:bg-emerald-700 disabled:opacity-50"
              >
                Confirmar recebimento
              </button>
            </div>
          ) : (
            <div className="mt-3">
              <textarea
                value={xml}
                onChange={(event) => setXml(event.target.value)}
                rows={6}
                placeholder="Cole aqui o XML da NF-e do fornecedor"
                className="w-full rounded-lg border border-slate-200 p-3 font-mono text-[11px] outline-none focus:border-blue-500 dark:border-slate-700"
              />
              <button
                type="button"
                onClick={submitXmlReceiving}
                disabled={busy || !xml.trim()}
                className="mt-2 h-9 w-full rounded-lg bg-emerald-600 text-xs font-bold text-white transition hover:bg-emerald-700 disabled:opacity-50"
              >
                Importar XML e confirmar recebimento
              </button>
            </div>
          )}
        </div>
      )}

      {error && <p className="mt-3 text-xs text-red-600">{error}</p>}
    </div>
  );
}

export function PurchasingScreen() {
  const [signedIn, setSignedIn] = useState(false);
  const [branchId, setBranchId] = useState('matriz');
  const [orders, setOrders] = useState<PurchaseOrder[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const refresh = async () => {
    setLoading(true);
    try {
      const items = await listPurchaseOrders(branchId.trim());
      setOrders(items);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => setSignedIn(isSignedIn()), []);
  useEffect(() => {
    if (signedIn) void refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [signedIn, branchId]);

  const selected = orders.find((order) => order.id === selectedId) ?? null;

  const summary = useMemo(
    () => ({
      cotacao: orders.filter((order) => order.status === 'EM_COTACAO').length,
      aprovado: orders.filter((order) => order.status === 'APROVADO').length,
      parcial: orders.filter((order) => order.status === 'RECEBIDO_PARCIAL').length,
      recebido: orders.filter((order) => order.status === 'RECEBIDO').length,
    }),
    [orders],
  );

  if (!signedIn) return <LoginPanel onSignedIn={() => setSignedIn(true)} />;

  return (
    <main className="relative min-h-screen overflow-hidden bg-[#f6f8fb] text-slate-950 dark:bg-slate-950 dark:text-slate-100">
      <div className="pointer-events-none absolute inset-x-0 top-0 h-72 bg-gradient-to-b from-blue-50/90 to-transparent" />
      <div className="relative mx-auto max-w-7xl px-5 py-8 sm:px-8 lg:px-10 lg:py-10">
        <header className="flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-[0.18em] text-blue-600">
              <span className="h-1.5 w-1.5 rounded-full bg-blue-600" /> Compras
            </div>
            <h1 className="mt-3 text-3xl font-bold tracking-[-0.035em] text-slate-950 sm:text-4xl dark:text-slate-100">
              Compras e recebimento
            </h1>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-500 dark:text-slate-400">
              Da cotação com mais de um fornecedor até a conferência do que chegou — manual ou por
              XML da NF-e — com custo médio e contas a pagar atualizados automaticamente.
            </p>
          </div>
          <input
            value={branchId}
            onChange={(event) => setBranchId(event.target.value)}
            placeholder="id da filial"
            className="h-12 w-40 rounded-xl border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-800 shadow-sm outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200"
          />
        </header>

        <section className="mt-8 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {[
            { label: 'Em cotação', value: summary.cotacao, color: 'text-amber-600 bg-amber-50' },
            { label: 'Aprovados', value: summary.aprovado, color: 'text-blue-600 bg-blue-50' },
            {
              label: 'Recebidos em parte',
              value: summary.parcial,
              color: 'text-violet-600 bg-violet-50',
            },
            {
              label: 'Recebidos',
              value: summary.recebido,
              color: 'text-emerald-600 bg-emerald-50',
            },
          ].map((tile) => (
            <article
              key={tile.label}
              className="rounded-2xl border border-white bg-white/90 p-5 shadow-[0_8px_30px_-18px_rgba(15,23,42,.25)] backdrop-blur"
            >
              <p className="text-xs font-semibold text-slate-500 dark:text-slate-400">
                {tile.label}
              </p>
              <strong className="mt-2 block text-2xl font-bold tracking-tight text-slate-950 dark:text-slate-100">
                {tile.value}
              </strong>
            </article>
          ))}
        </section>

        <div className="mt-6 grid gap-5 lg:grid-cols-[380px_1fr]">
          <div className="space-y-4">
            <NewOrderForm branchId={branchId.trim()} onCreated={refresh} />
            <div className="rounded-2xl border border-slate-200/70 bg-white shadow-[0_18px_50px_-30px_rgba(15,23,42,.28)] dark:bg-slate-900">
              <div className="border-b border-slate-100 p-4">
                <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">Pedidos</h3>
              </div>
              <div className="max-h-[560px] divide-y divide-slate-100 overflow-y-auto">
                {loading && <p className="p-4 text-xs text-slate-400">Carregando…</p>}
                {!loading && orders.length === 0 && (
                  <p className="p-4 text-xs text-slate-400">Nenhum pedido para esta filial.</p>
                )}
                {orders.map((order) => (
                  <button
                    key={order.id}
                    type="button"
                    onClick={() => setSelectedId(order.id)}
                    className={`flex w-full items-center justify-between px-4 py-3 text-left transition hover:bg-slate-50 ${
                      selectedId === order.id ? 'bg-blue-50/70' : ''
                    }`}
                  >
                    <span>
                      <span className="block text-xs font-bold text-slate-800 dark:text-slate-200">
                        {order.id.slice(0, 8)}
                      </span>
                      <span className="mt-0.5 block text-[11px] text-slate-400">
                        {order.items.length} item(ns)
                      </span>
                    </span>
                    <span
                      className={`rounded-full px-2 py-0.5 text-[9px] font-bold ${STATUS_STYLE[order.status]}`}
                    >
                      {STATUS_LABEL[order.status]}
                    </span>
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div>
            {selected ? (
              <OrderDetail order={selected} onChanged={refresh} />
            ) : (
              <div className="flex h-full min-h-[300px] items-center justify-center rounded-2xl border border-dashed border-slate-300 text-sm text-slate-400">
                Selecione um pedido para ver cotações e recebimento
              </div>
            )}
          </div>
        </div>
      </div>
    </main>
  );
}
