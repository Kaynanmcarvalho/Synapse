/* eslint-disable max-lines, max-lines-per-function */
import { useEffect, useState } from 'react';
import { Plus, X } from 'lucide-react';
import { listMyCustomers, type Customer } from '../customers/customers.api';
import { getMyProfile } from '../dashboard/dashboard.api';
import {
  createOrderQuote,
  listMyOrders,
  listProducts,
  resolvePrice,
  type Order,
  type OrderItem,
  type ProductListItem,
} from './orders.api';

const money = (centavos: number) =>
  new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(centavos / 100);

const STATUS_LABEL: Record<Order['status'], string> = {
  QUOTE: 'Orçamento',
  ORDER: 'Pedido',
  APPROVED: 'Aprovado',
  PICKING: 'Em separação',
  INVOICED: 'Faturado',
  DELIVERED: 'Entregue',
  CANCELLED: 'Cancelado',
};

const STATUS_STYLE: Record<Order['status'], string> = {
  QUOTE: 'bg-slate-100 text-slate-600',
  ORDER: 'bg-blue-50 text-blue-700',
  APPROVED: 'bg-blue-50 text-blue-700',
  PICKING: 'bg-violet-50 text-violet-700',
  INVOICED: 'bg-emerald-50 text-emerald-700',
  DELIVERED: 'bg-emerald-50 text-emerald-700',
  CANCELLED: 'bg-rose-50 text-rose-700',
};

interface DraftLine {
  productId: string;
  productName: string;
  quantity: string;
  unitPriceCentavos: number | null;
  resolving: boolean;
}

function NewOrderForm({
  branchId,
  onCreated,
  onCancel,
}: {
  readonly branchId: string;
  readonly onCreated: () => void;
  readonly onCancel: () => void;
}) {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [products, setProducts] = useState<ProductListItem[]>([]);
  const [customerId, setCustomerId] = useState('');
  const [lines, setLines] = useState<DraftLine[]>([]);
  const [productPick, setProductPick] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    void Promise.all([listMyCustomers(), listProducts()]).then(
      ([customersResult, productsResult]) => {
        setCustomers(customersResult);
        setProducts(productsResult.items);
      },
    );
  }, []);

  const addLine = async (productId: string) => {
    const product = products.find((candidate) => candidate.id === productId);
    if (!product) return;
    const line: DraftLine = {
      productId,
      productName: product.name,
      quantity: '1',
      unitPriceCentavos: null,
      resolving: true,
    };
    setLines((current) => [...current, line]);
    setProductPick('');

    try {
      const resolved = await resolvePrice(productId, branchId, customerId || 'sem-cliente', 1);
      setLines((current) =>
        current.map((candidate) =>
          candidate === line
            ? {
                ...candidate,
                unitPriceCentavos: Math.round(resolved.price * 100),
                resolving: false,
              }
            : candidate,
        ),
      );
    } catch {
      setLines((current) =>
        current.map((candidate) =>
          candidate === line ? { ...candidate, resolving: false } : candidate,
        ),
      );
    }
  };

  const removeLine = (index: number) =>
    setLines((current) => current.filter((_, i) => i !== index));
  const setQuantity = (index: number, quantity: string) =>
    setLines((current) => current.map((line, i) => (i === index ? { ...line, quantity } : line)));

  const total = lines.reduce((sum, line) => {
    const qty = Number(line.quantity) || 0;
    return sum + qty * (line.unitPriceCentavos ?? 0);
  }, 0);

  const submit = async () => {
    setError(null);
    if (!customerId) {
      setError('Selecione um cliente');
      return;
    }
    if (lines.length === 0) {
      setError('Adicione ao menos um item');
      return;
    }
    setSaving(true);
    try {
      const items: OrderItem[] = lines.map((line) => {
        const qty = Math.max(1, Math.round(Number(line.quantity) || 1));
        const unitPrice = line.unitPriceCentavos ?? 0;
        return {
          productId: line.productId,
          barcode: null,
          description: line.productName,
          quantity: qty * 1000, // milésimos
          unitPrice,
          discount: 0,
          surcharge: 0,
          total: qty * unitPrice,
        };
      });
      await createOrderQuote({ branchId, customerId, items });
      onCreated();
    } catch (cause) {
      setError((cause as Error).message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="rounded-2xl border border-white bg-white/90 p-4 shadow-[0_8px_24px_-16px_rgba(15,23,42,.25)]">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-bold text-slate-900">Novo pedido</h2>
        <button type="button" onClick={onCancel} aria-label="Cancelar" className="text-slate-400">
          <X size={18} />
        </button>
      </div>

      <label className="mt-3 block">
        <span className="mb-1 block text-[11px] font-bold uppercase text-slate-400">Cliente</span>
        <select
          value={customerId}
          onChange={(event) => setCustomerId(event.target.value)}
          className="h-11 w-full rounded-xl border border-slate-200 px-3 text-sm outline-none focus:border-blue-500"
        >
          <option value="">Selecione…</option>
          {customers.map((customer) => (
            <option key={customer.id} value={customer.id}>
              {customer.name}
            </option>
          ))}
        </select>
      </label>

      <label className="mt-3 block">
        <span className="mb-1 block text-[11px] font-bold uppercase text-slate-400">
          Adicionar produto
        </span>
        <select
          value={productPick}
          onChange={(event) => {
            setProductPick(event.target.value);
            if (event.target.value) void addLine(event.target.value);
          }}
          className="h-11 w-full rounded-xl border border-slate-200 px-3 text-sm outline-none focus:border-blue-500"
        >
          <option value="">Selecione um produto…</option>
          {products.map((product) => (
            <option key={product.id} value={product.id}>
              {product.name} · {product.sku}
            </option>
          ))}
        </select>
      </label>

      <div className="mt-3 space-y-2">
        {lines.map((line, index) => (
          <div
            key={`${line.productId}-${index}`}
            className="flex items-center gap-2 rounded-xl bg-slate-50 p-2.5"
          >
            <span className="min-w-0 flex-1 truncate text-xs font-semibold text-slate-700">
              {line.productName}
            </span>
            <input
              value={line.quantity}
              onChange={(event) => setQuantity(index, event.target.value)}
              type="number"
              min={1}
              className="h-8 w-14 rounded-lg border border-slate-200 px-2 text-center text-xs outline-none"
            />
            <span className="w-20 text-right text-xs font-bold text-slate-600">
              {line.resolving ? '…' : money(line.unitPriceCentavos ?? 0)}
            </span>
            <button
              type="button"
              onClick={() => removeLine(index)}
              aria-label="Remover item"
              className="text-slate-400 hover:text-rose-600"
            >
              <X size={14} />
            </button>
          </div>
        ))}
      </div>

      {lines.length > 0 && (
        <div className="mt-3 flex items-center justify-between border-t border-slate-100 pt-3 text-sm font-bold text-slate-900">
          <span>Total</span>
          <span>{money(total)}</span>
        </div>
      )}

      {error && <p className="mt-3 text-xs text-red-600">{error}</p>}

      <button
        type="button"
        onClick={submit}
        disabled={saving}
        className="mt-4 h-12 w-full rounded-xl bg-blue-600 text-sm font-bold text-white transition hover:bg-blue-700 disabled:opacity-50"
      >
        {saving ? 'Enviando…' : 'Criar orçamento'}
      </button>
    </div>
  );
}

export function OrdersScreen() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [onlyPending, setOnlyPending] = useState(false);
  const [branchId, setBranchId] = useState<string | null>(null);

  useEffect(() => {
    void getMyProfile().then((profile) => setBranchId(profile.branchId));
  }, []);

  const refresh = async () => {
    setLoading(true);
    try {
      setOrders(await listMyOrders(onlyPending));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [onlyPending]);

  return (
    <main className="px-5 pb-6 pt-8">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-extrabold text-slate-950">Pedidos</h1>
        {!creating && (
          <button
            type="button"
            onClick={() => setCreating(true)}
            className="flex h-10 items-center gap-1.5 rounded-xl bg-slate-950 px-3.5 text-xs font-bold text-white"
          >
            <Plus size={14} /> Novo
          </button>
        )}
      </div>

      {creating && branchId ? (
        <div className="mt-4">
          <NewOrderForm
            branchId={branchId}
            onCreated={() => {
              setCreating(false);
              void refresh();
            }}
            onCancel={() => setCreating(false)}
          />
        </div>
      ) : (
        <>
          <div className="mt-4 flex gap-1.5">
            <button
              type="button"
              onClick={() => setOnlyPending(false)}
              className={`rounded-full px-3 py-1.5 text-xs font-bold ${!onlyPending ? 'bg-slate-950 text-white' : 'bg-slate-100 text-slate-500'}`}
            >
              Todos
            </button>
            <button
              type="button"
              onClick={() => setOnlyPending(true)}
              className={`rounded-full px-3 py-1.5 text-xs font-bold ${onlyPending ? 'bg-slate-950 text-white' : 'bg-slate-100 text-slate-500'}`}
            >
              Pendentes
            </button>
          </div>

          {loading && <p className="mt-6 text-center text-sm text-slate-400">Carregando…</p>}
          {!loading && orders.length === 0 && (
            <p className="mt-6 text-center text-sm text-slate-400">Nenhum pedido ainda.</p>
          )}

          <ul className="mt-4 space-y-2">
            {orders.map((order) => (
              <li
                key={order.id}
                className="rounded-2xl border border-white bg-white/90 p-4 shadow-[0_8px_24px_-16px_rgba(15,23,42,.25)]"
              >
                <div className="flex items-center justify-between">
                  <span className="text-sm font-bold text-slate-900">
                    Pedido {order.id.slice(0, 8)}
                  </span>
                  <span
                    className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${STATUS_STYLE[order.status]}`}
                  >
                    {STATUS_LABEL[order.status]}
                  </span>
                </div>
                <p className="mt-1 text-xs text-slate-400">
                  {order.items.length} item(ns) ·{' '}
                  {new Date(order.createdAt).toLocaleDateString('pt-BR')}
                </p>
                <p className="mt-2 text-right text-sm font-extrabold text-slate-950">
                  {money(order.total)}
                </p>
              </li>
            ))}
          </ul>
        </>
      )}
    </main>
  );
}
