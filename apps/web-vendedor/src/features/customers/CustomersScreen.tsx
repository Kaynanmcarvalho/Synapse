import { useEffect, useMemo, useState } from 'react';
import { Phone, Search } from 'lucide-react';
import { listMyCustomers, type Customer } from './customers.api';

const STATUS_STYLE: Record<Customer['financialStatus'], string> = {
  REGULAR: 'bg-emerald-50 text-emerald-700',
  OVERDUE: 'bg-amber-50 text-amber-700',
  BLOCKED: 'bg-rose-50 text-rose-700',
};

const STATUS_LABEL: Record<Customer['financialStatus'], string> = {
  REGULAR: 'Regular',
  OVERDUE: 'Em atraso',
  BLOCKED: 'Bloqueado',
};

export function CustomersScreen() {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    void (async () => {
      try {
        setCustomers(await listMyCustomers());
      } catch (cause) {
        setError((cause as Error).message);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const filtered = useMemo(() => {
    const term = query.trim().toLocaleLowerCase('pt-BR');
    if (!term) return customers;
    return customers.filter(
      (customer) =>
        customer.name.toLocaleLowerCase('pt-BR').includes(term) || customer.taxId.includes(term),
    );
  }, [customers, query]);

  return (
    <main className="px-5 pb-6 pt-8">
      <h1 className="text-2xl font-extrabold text-slate-950">Minha carteira</h1>
      <p className="mt-1 text-xs text-slate-500">{customers.length} cliente(s)</p>

      <div className="relative mt-4">
        <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
        <input
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Buscar por nome ou CNPJ/CPF"
          className="h-11 w-full rounded-xl border border-slate-200 bg-white pl-10 pr-3 text-sm outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10"
        />
      </div>

      {error && <p className="mt-4 rounded-xl bg-rose-50 p-3 text-xs text-rose-700">{error}</p>}
      {loading && <p className="mt-6 text-center text-sm text-slate-400">Carregando…</p>}
      {!loading && filtered.length === 0 && (
        <p className="mt-6 text-center text-sm text-slate-400">Nenhum cliente encontrado.</p>
      )}

      <ul className="mt-4 space-y-2">
        {filtered.map((customer) => (
          <li
            key={customer.id}
            className="rounded-2xl border border-white bg-white/90 p-4 shadow-[0_8px_24px_-16px_rgba(15,23,42,.25)]"
          >
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="truncate text-sm font-bold text-slate-900">{customer.name}</p>
                <p className="mt-0.5 text-[11px] text-slate-400">{customer.taxId}</p>
              </div>
              <span
                className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-bold ${STATUS_STYLE[customer.financialStatus]}`}
              >
                {STATUS_LABEL[customer.financialStatus]}
              </span>
            </div>
            {customer.phone && (
              <a
                href={`tel:${customer.phone}`}
                className="mt-3 flex items-center gap-1.5 text-xs font-semibold text-blue-600"
              >
                <Phone size={13} /> {customer.phone}
              </a>
            )}
          </li>
        ))}
      </ul>
    </main>
  );
}
