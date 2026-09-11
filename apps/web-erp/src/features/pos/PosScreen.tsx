/* eslint-disable max-lines, max-lines-per-function */
import { useEffect, useRef, useState } from 'react';
import { Button, Card, CardHeader, CardTitle, Input, Spinner } from '@synapse/ui';
import {
  ArrowDownToLine,
  ArrowUpFromLine,
  Banknote,
  Barcode,
  CheckCircle2,
  Clock,
  CreditCard,
  Loader2,
  Lock,
  Minus,
  Plus,
  QrCode,
  Receipt,
  Search,
  Trash2,
  Unlock,
  Wallet,
  X,
  type LucideIcon,
} from 'lucide-react';
import { currentUid } from '../../lib/dev-auth';
import {
  addCashMovement,
  closeCash,
  completeSale,
  devSignIn,
  getCurrentSession,
  isSignedIn,
  listBranches,
  openCash,
  resolvePrice,
  searchCustomers,
  searchProducts,
  type BranchItem,
  type CashSession,
  type CustomerListItem,
  type PaymentMethod,
  type PosItemInput,
  type PosSale,
  type ProductListItem,
} from './pos.api';

const money = (cents: number) =>
  new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(cents / 100);

const BRANCH_STORAGE_KEY = 'synapse:pos:branchId';

interface CartLine extends PosItemInput {
  readonly key: string;
}

const PAYMENT_META: Record<PaymentMethod, { label: string; icon: LucideIcon }> = {
  CASH: { label: 'Dinheiro', icon: Banknote },
  PIX: { label: 'PIX', icon: QrCode },
  DEBIT_CARD: { label: 'Débito', icon: CreditCard },
  CREDIT_CARD: { label: 'Crédito', icon: CreditCard },
  BOLETO: { label: 'Boleto', icon: Barcode },
  ON_ACCOUNT: { label: 'A prazo', icon: Clock },
  WALLET: { label: 'Carteira', icon: Wallet },
};

/** jsx-a11y proibe `autoFocus`; um ref + useEffect chega no mesmo resultado
 *  sem o lint reclamar (o autofoco em si é intencional nesses formulários
 *  curtos, o objetivo do lint é so evitar a prop declarativa). */
function useAutoFocus<T extends HTMLElement>() {
  const ref = useRef<T>(null);
  useEffect(() => ref.current?.focus(), []);
  return ref;
}

const parseQuantityQuery = (raw: string): { quantity: number; term: string } => {
  const match = /^(\d+)\*(.+)$/.exec(raw.trim());
  if (!match?.[1] || !match[2]) return { quantity: 1, term: raw.trim() };
  return { quantity: Math.max(1, Number.parseInt(match[1], 10)), term: match[2].trim() };
};

function OpenCashCard({
  branchId,
  setBranchId,
  branches,
  onOpened,
}: {
  readonly branchId: string;
  readonly setBranchId: (id: string) => void;
  readonly branches: readonly BranchItem[];
  readonly onOpened: (session: CashSession) => void;
}) {
  const [amount, setAmount] = useState('0');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    setBusy(true);
    setError('');
    try {
      const cents = Math.round(Number(amount.replace(',', '.')) * 100);
      onOpened(await openCash(branchId, Number.isFinite(cents) ? Math.max(0, cents) : 0));
    } catch (cause) {
      setError((cause as Error).message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <main className="mx-auto flex min-h-[75vh] max-w-md flex-col justify-center p-6">
      <div className="rounded-2xl border border-slate-200 bg-white p-8 shadow-sm dark:border-slate-800 dark:bg-slate-900">
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-blue-50 text-blue-600 dark:bg-blue-500/10 dark:text-blue-300">
          <Lock size={24} strokeWidth={1.8} />
        </div>
        <h1 className="mt-4 text-center text-xl font-bold text-slate-950 dark:text-slate-100">
          Abrir caixa
        </h1>
        <p className="mt-1 text-center text-sm text-slate-500 dark:text-slate-400">
          Informe a filial e o valor inicial em dinheiro para começar a vender.
        </p>
        <form onSubmit={(event) => void submit(event)} className="mt-6 space-y-4">
          <label className="block text-sm">
            <span className="mb-1 block font-semibold text-slate-700 dark:text-slate-300">
              Filial
            </span>
            {branches.length > 0 ? (
              <select
                value={branchId}
                onChange={(event) => setBranchId(event.target.value)}
                className="h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm outline-none focus:border-blue-500 dark:border-slate-700 dark:bg-slate-950"
              >
                {branches.map((branch) => (
                  <option key={branch.id} value={branch.id}>
                    {branch.name}
                  </option>
                ))}
              </select>
            ) : (
              <input
                value={branchId}
                onChange={(event) => setBranchId(event.target.value)}
                className="h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm outline-none focus:border-blue-500 dark:border-slate-700 dark:bg-slate-950"
              />
            )}
          </label>
          <label className="block text-sm">
            <span className="mb-1 block font-semibold text-slate-700 dark:text-slate-300">
              Valor inicial em caixa
            </span>
            <input
              inputMode="decimal"
              value={amount}
              onChange={(event) => setAmount(event.target.value)}
              className="h-12 w-full rounded-xl border border-slate-200 bg-white px-3 text-lg font-bold outline-none focus:border-blue-500 dark:border-slate-700 dark:bg-slate-950"
            />
          </label>
          {error && <p className="text-xs text-red-600 dark:text-red-400">{error}</p>}
          <button
            type="submit"
            disabled={busy}
            className="flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-blue-600 text-sm font-bold text-white transition hover:bg-blue-700 disabled:opacity-50"
          >
            {busy ? <Loader2 size={16} className="animate-spin" /> : <Unlock size={16} />}
            {busy ? 'Abrindo…' : 'Abrir caixa'}
          </button>
        </form>
      </div>
    </main>
  );
}

function ModalShell({
  title,
  onClose,
  children,
}: {
  readonly title: string;
  readonly onClose: () => void;
  readonly children: React.ReactNode;
}) {
  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center bg-slate-950/40 p-4 backdrop-blur-sm dark:bg-black/60">
      <button type="button" aria-label="Fechar" className="absolute inset-0" onClick={onClose} />
      <div className="relative w-full max-w-md rounded-2xl border border-slate-200 bg-white p-6 shadow-2xl dark:border-slate-700 dark:bg-slate-900">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-sm font-bold text-slate-900 dark:text-slate-100">{title}</h2>
          <button
            type="button"
            aria-label="Fechar"
            onClick={onClose}
            className="text-slate-400 hover:text-slate-700 dark:hover:text-slate-200"
          >
            <X size={18} />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}

function CashMovementModal({
  kind,
  onClose,
  onSubmit,
}: {
  readonly kind: 'supply' | 'withdrawal';
  readonly onClose: () => void;
  readonly onSubmit: (amountCents: number, reason: string) => Promise<void>;
}) {
  const [amount, setAmount] = useState('');
  const [reason, setReason] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const amountRef = useAutoFocus<HTMLInputElement>();

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    const cents = Math.round(Number(amount.replace(',', '.')) * 100);
    if (!Number.isFinite(cents) || cents <= 0) {
      setError('Informe um valor válido');
      return;
    }
    if (reason.trim().length < 3) {
      setError('Descreva o motivo (mín. 3 caracteres)');
      return;
    }
    setBusy(true);
    setError('');
    try {
      await onSubmit(cents, reason.trim());
      onClose();
    } catch (cause) {
      setError((cause as Error).message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <ModalShell
      title={kind === 'supply' ? 'Suprimento de caixa' : 'Sangria de caixa'}
      onClose={onClose}
    >
      <form onSubmit={(event) => void submit(event)} className="space-y-4">
        <label className="block text-sm">
          <span className="mb-1 block font-semibold text-slate-700 dark:text-slate-300">Valor</span>
          <input
            ref={amountRef}
            inputMode="decimal"
            value={amount}
            onChange={(event) => setAmount(event.target.value)}
            className="h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm outline-none focus:border-blue-500 dark:border-slate-700 dark:bg-slate-950"
          />
        </label>
        <label className="block text-sm">
          <span className="mb-1 block font-semibold text-slate-700 dark:text-slate-300">
            Motivo
          </span>
          <input
            value={reason}
            onChange={(event) => setReason(event.target.value)}
            className="h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm outline-none focus:border-blue-500 dark:border-slate-700 dark:bg-slate-950"
          />
        </label>
        {error && <p className="text-xs text-red-600 dark:text-red-400">{error}</p>}
        <button
          type="submit"
          disabled={busy}
          className="flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-slate-950 text-sm font-bold text-white transition hover:bg-blue-600 disabled:opacity-50 dark:bg-slate-100 dark:text-slate-900"
        >
          {busy && <Loader2 size={16} className="animate-spin" />}
          Confirmar
        </button>
      </form>
    </ModalShell>
  );
}

function CloseCashModal({
  session,
  onClose,
  onConfirm,
}: {
  readonly session: CashSession;
  readonly onClose: () => void;
  readonly onConfirm: (countedCash: number) => Promise<CashSession>;
}) {
  const [counted, setCounted] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [result, setResult] = useState<CashSession | null>(null);
  const countedRef = useAutoFocus<HTMLInputElement>();

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    const cents = Math.round(Number(counted.replace(',', '.')) * 100);
    if (!Number.isFinite(cents) || cents < 0) {
      setError('Informe o valor contado em dinheiro');
      return;
    }
    setBusy(true);
    setError('');
    try {
      setResult(await onConfirm(cents));
    } catch (cause) {
      setError((cause as Error).message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <ModalShell title="Fechar caixa" onClose={onClose}>
      {result ? (
        <div className="space-y-3 text-center">
          <p className="text-sm text-slate-500 dark:text-slate-400">Caixa fechado com sucesso.</p>
          <p className="text-3xl font-extrabold text-slate-950 dark:text-slate-100">
            {money(result.difference ?? 0)}
          </p>
          <p className="text-xs text-slate-400">
            {(result.difference ?? 0) === 0
              ? 'Sem diferença'
              : (result.difference ?? 0) > 0
                ? 'Sobra em caixa'
                : 'Falta em caixa'}
          </p>
          <button
            type="button"
            onClick={() => window.location.reload()}
            className="mt-2 h-11 w-full rounded-xl bg-slate-950 text-sm font-bold text-white dark:bg-slate-100 dark:text-slate-900"
          >
            Ok
          </button>
        </div>
      ) : (
        <form onSubmit={(event) => void submit(event)} className="space-y-4">
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Saldo esperado em dinheiro: <strong>{money(session.expectedCash)}</strong>
          </p>
          <label className="block text-sm">
            <span className="mb-1 block font-semibold text-slate-700 dark:text-slate-300">
              Valor contado em dinheiro
            </span>
            <input
              ref={countedRef}
              inputMode="decimal"
              value={counted}
              onChange={(event) => setCounted(event.target.value)}
              className="h-12 w-full rounded-xl border border-slate-200 bg-white px-3 text-lg font-bold outline-none focus:border-blue-500 dark:border-slate-700 dark:bg-slate-950"
            />
          </label>
          {error && <p className="text-xs text-red-600 dark:text-red-400">{error}</p>}
          <button
            type="submit"
            disabled={busy}
            className="flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-red-600 text-sm font-bold text-white transition hover:bg-red-700 disabled:opacity-50"
          >
            {busy && <Loader2 size={16} className="animate-spin" />}
            Fechar caixa
          </button>
        </form>
      )}
    </ModalShell>
  );
}

function PaymentModal({
  total,
  onClose,
  onConfirm,
}: {
  readonly total: number;
  readonly onClose: () => void;
  readonly onConfirm: (payments: Array<{ method: PaymentMethod; amount: number }>) => Promise<void>;
}) {
  const [payments, setPayments] = useState<Array<{ method: PaymentMethod; amount: string }>>([
    { method: 'CASH', amount: (total / 100).toFixed(2).replace('.', ',') },
  ]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const paidCents = payments.reduce(
    (sum, p) => sum + (Math.round(Number(p.amount.replace(',', '.')) * 100) || 0),
    0,
  );
  const remaining = total - paidCents;

  const setMethod = (index: number, method: PaymentMethod) =>
    setPayments((current) => current.map((p, i) => (i === index ? { ...p, method } : p)));
  const setAmount = (index: number, amount: string) =>
    setPayments((current) => current.map((p, i) => (i === index ? { ...p, amount } : p)));
  const addSplit = () =>
    setPayments((current) => [
      ...current,
      { method: 'CASH', amount: (Math.max(0, remaining) / 100).toFixed(2).replace('.', ',') },
    ]);
  const removeSplit = (index: number) =>
    setPayments((current) => current.filter((_, i) => i !== index));

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (remaining !== 0) {
      setError('A soma dos pagamentos precisa ser igual ao total');
      return;
    }
    setBusy(true);
    setError('');
    try {
      await onConfirm(
        payments.map((p) => ({
          method: p.method,
          amount: Math.round(Number(p.amount.replace(',', '.')) * 100),
        })),
      );
    } catch (cause) {
      setError((cause as Error).message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <ModalShell title="Finalizar venda" onClose={onClose}>
      <p className="mb-4 text-center text-3xl font-extrabold text-slate-950 dark:text-slate-100">
        {money(total)}
      </p>
      <form onSubmit={(event) => void submit(event)} className="space-y-3">
        {payments.map((payment, index) => {
          const Icon = PAYMENT_META[payment.method].icon;
          return (
            <div key={index} className="flex items-center gap-2">
              <div className="relative flex-1">
                <Icon
                  size={15}
                  className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
                />
                <select
                  value={payment.method}
                  onChange={(event) => setMethod(index, event.target.value as PaymentMethod)}
                  className="h-11 w-full rounded-xl border border-slate-200 bg-white pl-9 pr-2 text-sm outline-none focus:border-blue-500 dark:border-slate-700 dark:bg-slate-950"
                >
                  {Object.entries(PAYMENT_META).map(([value, meta]) => (
                    <option key={value} value={value}>
                      {meta.label}
                    </option>
                  ))}
                </select>
              </div>
              <input
                inputMode="decimal"
                value={payment.amount}
                onChange={(event) => setAmount(index, event.target.value)}
                className="h-11 w-28 rounded-xl border border-slate-200 bg-white px-2 text-right text-sm font-bold outline-none focus:border-blue-500 dark:border-slate-700 dark:bg-slate-950"
              />
              {payments.length > 1 && (
                <button
                  type="button"
                  aria-label="Remover forma de pagamento"
                  onClick={() => removeSplit(index)}
                  className="text-slate-400 hover:text-red-600"
                >
                  <X size={16} />
                </button>
              )}
            </div>
          );
        })}
        <button
          type="button"
          onClick={addSplit}
          className="text-xs font-bold text-blue-600 hover:underline"
        >
          + dividir em outra forma de pagamento
        </button>
        <div className="flex items-center justify-between border-t border-slate-100 pt-3 text-sm dark:border-slate-800">
          <span className="text-slate-500 dark:text-slate-400">Restante</span>
          <strong className={remaining === 0 ? 'text-emerald-600' : 'text-amber-600'}>
            {money(remaining)}
          </strong>
        </div>
        {error && <p className="text-xs text-red-600 dark:text-red-400">{error}</p>}
        <button
          type="submit"
          disabled={busy || remaining !== 0}
          className="flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-emerald-600 text-sm font-bold text-white transition hover:bg-emerald-700 disabled:opacity-50"
        >
          {busy ? <Loader2 size={16} className="animate-spin" /> : <CheckCircle2 size={16} />}
          {busy ? 'Concluindo…' : 'Confirmar pagamento'}
        </button>
      </form>
    </ModalShell>
  );
}

function ProductSearch({
  branchId,
  onAdd,
  inputRef,
}: {
  readonly branchId: string;
  readonly onAdd: (item: PosItemInput) => void;
  readonly inputRef: React.RefObject<HTMLInputElement | null>;
}) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<ProductListItem[]>([]);
  const [highlighted, setHighlighted] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => inputRef.current?.focus(), [inputRef]);

  useEffect(() => {
    const { term } = parseQuantityQuery(query);
    if (!term) {
      setResults([]);
      return;
    }
    setLoading(true);
    const timeout = window.setTimeout(async () => {
      try {
        const { items } = await searchProducts(term);
        setResults(items);
        setHighlighted(0);
      } catch {
        setResults([]);
      } finally {
        setLoading(false);
      }
    }, 150);
    return () => window.clearTimeout(timeout);
  }, [query]);

  const addProduct = async (product: ProductListItem, quantity: number) => {
    setError('');
    try {
      const resolved = await resolvePrice(product.id, branchId, quantity);
      const unitPrice = Math.round(resolved.price * 100);
      onAdd({
        productId: product.id,
        barcode: product.ean,
        description: product.name,
        quantity: quantity * 1000,
        unitPrice,
        discount: 0,
        surcharge: 0,
      });
      setQuery('');
      setResults([]);
    } catch (cause) {
      setError((cause as Error).message);
    }
  };

  const quickAdd = async () => {
    const { quantity, term } = parseQuantityQuery(query);
    if (!term) return;
    if (results[highlighted]) {
      await addProduct(results[highlighted], quantity);
      return;
    }
    try {
      const { items } = await searchProducts(term);
      if (items[0]) await addProduct(items[0], quantity);
      else setError('Produto não encontrado');
    } catch (cause) {
      setError((cause as Error).message);
    }
  };

  const onKeyDown = (event: React.KeyboardEvent) => {
    if (event.key === 'ArrowDown') {
      event.preventDefault();
      setHighlighted((current) => Math.min(current + 1, results.length - 1));
    } else if (event.key === 'ArrowUp') {
      event.preventDefault();
      setHighlighted((current) => Math.max(current - 1, 0));
    }
  };

  return (
    <div className="relative">
      <form
        onSubmit={(event) => {
          event.preventDefault();
          void quickAdd();
        }}
      >
        <label
          htmlFor="pos-search"
          className="mb-1.5 block text-xs font-bold text-slate-500 dark:text-slate-400"
        >
          Código, código de barras ou nome do produto
        </label>
        <div className="relative">
          <Search
            size={18}
            className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-slate-400"
          />
          <input
            ref={inputRef}
            id="pos-search"
            autoComplete="off"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            onKeyDown={onKeyDown}
            placeholder="Ex.: 7891234567890 ou 3*RACAO01"
            className="h-14 w-full rounded-2xl border border-slate-200 bg-white pl-11 pr-4 text-lg outline-none transition focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
          />
        </div>
      </form>
      {error && <p className="mt-1.5 text-xs text-red-600 dark:text-red-400">{error}</p>}
      {(loading || results.length > 0) && query.trim() && (
        <div className="absolute z-20 mt-2 w-full overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl dark:border-slate-700 dark:bg-slate-900">
          {loading && <p className="px-4 py-3 text-xs text-slate-400">Buscando…</p>}
          {!loading &&
            results.map((product, index) => (
              <button
                key={product.id}
                type="button"
                onClick={() => void addProduct(product, parseQuantityQuery(query).quantity)}
                onMouseEnter={() => setHighlighted(index)}
                className={`flex w-full items-center justify-between gap-3 px-4 py-3 text-left text-sm transition ${
                  index === highlighted
                    ? 'bg-blue-50 dark:bg-blue-500/10'
                    : 'hover:bg-slate-50 dark:hover:bg-slate-800'
                }`}
              >
                <span className="min-w-0 flex-1">
                  <span className="block truncate font-semibold text-slate-900 dark:text-slate-100">
                    {product.name}
                  </span>
                  <span className="block text-xs text-slate-400">SKU {product.sku}</span>
                </span>
                <strong className="shrink-0 text-slate-700 dark:text-slate-300">
                  {money(Math.round(product.pricing.salePrice * 100))}
                </strong>
              </button>
            ))}
        </div>
      )}
    </div>
  );
}

function CartList({
  lines,
  onQuantity,
  onRemove,
}: {
  readonly lines: readonly CartLine[];
  readonly onQuantity: (key: string, quantity: number) => void;
  readonly onRemove: (key: string) => void;
}) {
  if (lines.length === 0) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center rounded-2xl border border-dashed border-slate-200 py-16 text-center text-sm text-slate-400 dark:border-slate-800">
        <Receipt size={28} className="mb-2 text-slate-300 dark:text-slate-700" />
        Nenhum item no carrinho ainda. Busque um produto acima.
      </div>
    );
  }
  return (
    <ul className="mt-4 flex-1 space-y-2 overflow-y-auto">
      {lines.map((line) => {
        const units = line.quantity / 1000;
        const total =
          Math.round((line.quantity * line.unitPrice) / 1000) - line.discount + line.surcharge;
        return (
          <li
            key={line.key}
            className="flex items-center gap-3 rounded-2xl border border-slate-100 bg-white p-3 dark:border-slate-800 dark:bg-slate-900"
          >
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-semibold text-slate-900 dark:text-slate-100">
                {line.description}
              </p>
              <p className="text-xs text-slate-400">{money(line.unitPrice)} / un.</p>
            </div>
            <div className="flex items-center gap-1.5 rounded-xl bg-slate-50 p-1 dark:bg-slate-800">
              <button
                type="button"
                aria-label="Diminuir quantidade"
                onClick={() => onQuantity(line.key, Math.max(1, units - 1))}
                className="flex h-7 w-7 items-center justify-center rounded-lg text-slate-500 hover:bg-white hover:text-slate-900 dark:hover:bg-slate-700 dark:hover:text-white"
              >
                <Minus size={13} />
              </button>
              <span className="w-6 text-center text-sm font-bold">{units}</span>
              <button
                type="button"
                aria-label="Aumentar quantidade"
                onClick={() => onQuantity(line.key, units + 1)}
                className="flex h-7 w-7 items-center justify-center rounded-lg text-slate-500 hover:bg-white hover:text-slate-900 dark:hover:bg-slate-700 dark:hover:text-white"
              >
                <Plus size={13} />
              </button>
            </div>
            <strong className="w-24 shrink-0 text-right text-sm text-slate-900 dark:text-slate-100">
              {money(total)}
            </strong>
            <button
              type="button"
              aria-label="Remover item"
              onClick={() => onRemove(line.key)}
              className="text-slate-300 hover:text-red-600"
            >
              <Trash2 size={16} />
            </button>
          </li>
        );
      })}
    </ul>
  );
}

function CustomerPanel({
  taxId,
  setTaxId,
  customerId,
  onSelectCustomer,
  inputRef,
}: {
  readonly taxId: string;
  readonly setTaxId: (value: string) => void;
  readonly customerId: string | null;
  readonly onSelectCustomer: (customer: CustomerListItem | null) => void;
  readonly inputRef: React.RefObject<HTMLInputElement | null>;
}) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<CustomerListItem[]>([]);

  useEffect(() => {
    if (query.trim().length < 2) {
      setResults([]);
      return;
    }
    const timeout = window.setTimeout(async () => {
      try {
        setResults(await searchCustomers(query.trim()));
      } catch {
        setResults([]);
      }
    }, 200);
    return () => window.clearTimeout(timeout);
  }, [query]);

  return (
    <div className="relative">
      <label
        htmlFor="pos-customer"
        className="mb-1.5 block text-xs font-bold text-slate-500 dark:text-slate-400"
      >
        Cliente · CPF/CNPJ na nota (F9)
      </label>
      <input
        ref={inputRef}
        id="pos-customer"
        value={taxId}
        onChange={(event) => {
          const digits = event.target.value.replace(/\D/g, '');
          setTaxId(digits);
          setQuery(event.target.value);
          if (customerId) onSelectCustomer(null);
        }}
        placeholder="Buscar por nome ou digitar o documento"
        className="h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm outline-none focus:border-blue-500 dark:border-slate-700 dark:bg-slate-950"
      />
      {results.length > 0 && (
        <div className="absolute z-20 mt-1.5 w-full overflow-hidden rounded-xl border border-slate-200 bg-white shadow-xl dark:border-slate-700 dark:bg-slate-900">
          {results.map((customer) => (
            <button
              key={customer.id}
              type="button"
              onClick={() => {
                onSelectCustomer(customer);
                setTaxId(customer.taxId);
                setQuery(customer.name);
                setResults([]);
              }}
              className="block w-full px-3 py-2 text-left text-sm hover:bg-slate-50 dark:hover:bg-slate-800"
            >
              <span className="block truncate font-semibold text-slate-800 dark:text-slate-100">
                {customer.name}
              </span>
              <span className="block text-xs text-slate-400">{customer.taxId}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

function PosWorkspace({
  branchId,
  session,
  onSessionUpdate,
  onClosed,
}: {
  readonly branchId: string;
  readonly session: CashSession;
  readonly onSessionUpdate: (session: CashSession) => void;
  readonly onClosed: () => void;
}) {
  const searchRef = useRef<HTMLInputElement>(null);
  const customerRef = useRef<HTMLInputElement>(null);
  const [lines, setLines] = useState<CartLine[]>([]);
  const [customerTaxId, setCustomerTaxId] = useState('');
  const [customerId, setCustomerId] = useState<string | null>(null);
  const [modal, setModal] = useState<'none' | 'payment' | 'supply' | 'withdrawal' | 'close'>(
    'none',
  );
  const [lastSale, setLastSale] = useState<PosSale | null>(null);

  const total = lines.reduce(
    (sum, line) =>
      sum + Math.round((line.quantity * line.unitPrice) / 1000) - line.discount + line.surcharge,
    0,
  );

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && modal !== 'none') {
        event.preventDefault();
        setModal('none');
        return;
      }
      if (event.key === 'F2') {
        event.preventDefault();
        searchRef.current?.focus();
      } else if (event.key === 'F9') {
        event.preventDefault();
        customerRef.current?.focus();
      } else if (event.key === 'F6') {
        event.preventDefault();
        setModal('supply');
      } else if (event.key === 'F10' && lines.length > 0) {
        event.preventDefault();
        setModal('payment');
      } else if (event.key === 'F12') {
        event.preventDefault();
        setModal('close');
      }
    };
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [modal, lines.length]);

  const addLine = (item: PosItemInput) => {
    setLines((current) => [...current, { ...item, key: `${item.productId}-${Date.now()}` }]);
  };
  const setQuantity = (key: string, units: number) =>
    setLines((current) =>
      current.map((line) => (line.key === key ? { ...line, quantity: units * 1000 } : line)),
    );
  const removeLine = (key: string) => setLines((current) => current.filter((l) => l.key !== key));

  const finishSale = async (payments: Array<{ method: PaymentMethod; amount: number }>) => {
    const sale = await completeSale(session.id, {
      customerId,
      customerTaxId: customerTaxId || null,
      sellerId: currentUid() ?? 'operador',
      items: lines.map(({ key: _key, ...item }) => item),
      payments,
    });
    setLastSale(sale);
    setLines([]);
    setCustomerTaxId('');
    setCustomerId(null);
    setModal('none');
    searchRef.current?.focus();
    const refreshed = await getCurrentSession(branchId);
    if (refreshed) onSessionUpdate(refreshed);
  };

  return (
    <main className="mx-auto flex h-[calc(100vh-5rem)] max-w-7xl flex-col p-4 sm:p-6">
      <header className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-slate-950 dark:text-slate-100">PDV / Caixa</h1>
          <p className="text-xs text-slate-400">
            Filial {branchId} · aberto às{' '}
            {new Date(session.openedAt).toLocaleTimeString('pt-BR', {
              hour: '2-digit',
              minute: '2-digit',
            })}{' '}
            · saldo esperado {money(session.expectedCash)}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <span className="hidden rounded-full bg-slate-100 px-3 py-1.5 text-[11px] font-semibold text-slate-500 lg:inline dark:bg-slate-800 dark:text-slate-400">
            F2 Produto · F9 Cliente · F6 Suprimento/Sangria · F10 Pagamento · F12 Fechar caixa
          </span>
          <button
            type="button"
            onClick={() => setModal('supply')}
            className="flex h-9 items-center gap-1.5 rounded-xl border border-slate-200 px-3 text-xs font-bold text-slate-600 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
          >
            <ArrowDownToLine size={14} /> Suprimento
          </button>
          <button
            type="button"
            onClick={() => setModal('withdrawal')}
            className="flex h-9 items-center gap-1.5 rounded-xl border border-slate-200 px-3 text-xs font-bold text-slate-600 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
          >
            <ArrowUpFromLine size={14} /> Sangria
          </button>
          <button
            type="button"
            onClick={() => setModal('close')}
            className="flex h-9 items-center gap-1.5 rounded-xl bg-slate-950 px-3 text-xs font-bold text-white hover:bg-red-600 dark:bg-slate-100 dark:text-slate-900"
          >
            <Lock size={14} /> Fechar caixa
          </button>
        </div>
      </header>

      {lastSale && (
        <div className="mb-4 flex items-center justify-between rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800 dark:border-emerald-900 dark:bg-emerald-500/10 dark:text-emerald-300">
          <span className="flex items-center gap-2">
            <CheckCircle2 size={16} /> Venda concluída — {money(lastSale.total)} · NFC-e{' '}
            {lastSale.nfceDocumentId.slice(0, 8)}
          </span>
          <button type="button" onClick={() => setLastSale(null)} aria-label="Fechar aviso">
            <X size={15} />
          </button>
        </div>
      )}

      <div className="grid flex-1 gap-6 overflow-hidden lg:grid-cols-[1fr_360px]">
        <section className="flex min-h-0 flex-col">
          <ProductSearch branchId={branchId} onAdd={addLine} inputRef={searchRef} />
          <CartList lines={lines} onQuantity={setQuantity} onRemove={removeLine} />
        </section>

        <aside className="flex flex-col gap-4">
          <div className="rounded-2xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900">
            <p className="text-xs font-bold uppercase tracking-wide text-slate-400">Total</p>
            <strong className="mt-1 block text-4xl font-extrabold text-slate-950 dark:text-slate-100">
              {money(total)}
            </strong>
            <button
              type="button"
              disabled={lines.length === 0}
              onClick={() => setModal('payment')}
              className="mt-4 flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-emerald-600 text-sm font-bold text-white transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-40"
            >
              Finalizar venda (F10)
            </button>
          </div>
          <div className="rounded-2xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900">
            <CustomerPanel
              taxId={customerTaxId}
              setTaxId={setCustomerTaxId}
              customerId={customerId}
              onSelectCustomer={(customer) => setCustomerId(customer?.id ?? null)}
              inputRef={customerRef}
            />
          </div>
          {session.movements.length > 0 && (
            <div className="min-h-0 flex-1 overflow-y-auto rounded-2xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900">
              <p className="mb-2 text-xs font-bold uppercase tracking-wide text-slate-400">
                Movimentações do caixa
              </p>
              <ul className="space-y-1.5 text-xs">
                {session.movements.map((movement) => (
                  <li
                    key={movement.id}
                    className="flex justify-between text-slate-500 dark:text-slate-400"
                  >
                    <span>{movement.reason}</span>
                    <span
                      className={
                        movement.type === 'WITHDRAWAL' ? 'text-red-600' : 'text-emerald-600'
                      }
                    >
                      {movement.type === 'WITHDRAWAL' ? '-' : '+'}
                      {money(movement.amount)}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </aside>
      </div>

      {modal === 'payment' && (
        <PaymentModal total={total} onClose={() => setModal('none')} onConfirm={finishSale} />
      )}
      {(modal === 'supply' || modal === 'withdrawal') && (
        <CashMovementModal
          kind={modal}
          onClose={() => setModal('none')}
          onSubmit={async (amount, reason) => {
            onSessionUpdate(await addCashMovement(session.id, modal, amount, reason));
          }}
        />
      )}
      {modal === 'close' && (
        <CloseCashModal
          session={session}
          onClose={() => setModal('none')}
          onConfirm={async (countedCash) => {
            const closed = await closeCash(session.id, countedCash);
            onSessionUpdate(closed);
            onClosed();
            return closed;
          }}
        />
      )}
    </main>
  );
}

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
    <main className="flex min-h-full items-center justify-center p-8">
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
          <Button onClick={() => void submit()} disabled={loading}>
            {loading ? <Spinner /> : 'Entrar'}
          </Button>
        </div>
      </Card>
    </main>
  );
}

export function PosScreen() {
  const [signedIn, setSignedIn] = useState(isSignedIn());
  const [branchId, setBranchId] = useState(
    () => localStorage.getItem(BRANCH_STORAGE_KEY) ?? 'matriz',
  );
  const [branches, setBranches] = useState<BranchItem[]>([]);
  const [session, setSession] = useState<CashSession | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    localStorage.setItem(BRANCH_STORAGE_KEY, branchId);
  }, [branchId]);

  useEffect(() => {
    if (!signedIn) return;
    void listBranches()
      .then(setBranches)
      .catch(() => setBranches([]));
  }, [signedIn]);

  useEffect(() => {
    if (!signedIn) return undefined;
    let cancelled = false;
    setLoading(true);
    void getCurrentSession(branchId)
      .then((current) => {
        if (!cancelled) setSession(current);
      })
      .catch(() => {
        if (!cancelled) setSession(null);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [branchId, signedIn]);

  if (!signedIn) return <LoginPanel onSignedIn={() => setSignedIn(true)} />;

  if (loading) {
    return (
      <main className="flex min-h-[75vh] items-center justify-center">
        <Loader2 size={22} className="animate-spin text-slate-400" />
      </main>
    );
  }

  if (!session) {
    return (
      <OpenCashCard
        branchId={branchId}
        setBranchId={setBranchId}
        branches={branches}
        onOpened={setSession}
      />
    );
  }

  return (
    <PosWorkspace
      branchId={branchId}
      session={session}
      onSessionUpdate={setSession}
      onClosed={() => setSession(null)}
    />
  );
}
