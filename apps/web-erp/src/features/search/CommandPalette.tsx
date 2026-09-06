/* eslint-disable max-lines-per-function */
import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Boxes,
  FileText,
  Package,
  Receipt,
  Search,
  ShoppingCart,
  Truck,
  type LucideIcon,
} from 'lucide-react';
import { globalSearch, type SearchEntityType, type SearchResultItem } from './search.api';

const TYPE_ICON: Record<SearchEntityType, LucideIcon> = {
  seller: Boxes,
  customer: Boxes,
  supplier: Truck,
  product: Package,
  order: ShoppingCart,
  fiscalDocument: FileText,
  titulo: Receipt,
};

const TYPE_LABEL: Record<SearchEntityType, string> = {
  seller: 'Vendedor',
  customer: 'Cliente',
  supplier: 'Fornecedor',
  product: 'Produto',
  order: 'Pedido',
  fiscalDocument: 'NF-e',
  titulo: 'Boleto/título',
};

/** §59 "atalho Ctrl+K, buscando cliente, produto, pedido, NF-e, boleto e
 *  vendedor no mesmo campo". `open`/`onOpenChange` são controlados de fora
 *  (AppShell) porque o atalho global precisa funcionar em qualquer tela, não
 *  só quando este componente já está montado com foco. */
export function CommandPalette({
  open,
  onOpenChange,
}: {
  readonly open: boolean;
  readonly onOpenChange: (open: boolean) => void;
}) {
  const navigate = useNavigate();
  const inputRef = useRef<HTMLInputElement>(null);
  const [query, setQuery] = useState('');
  const [items, setItems] = useState<readonly SearchResultItem[]>([]);
  const [unavailable, setUnavailable] = useState<readonly string[]>([]);
  const [highlighted, setHighlighted] = useState(0);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (open) {
      setQuery('');
      setItems([]);
      setHighlighted(0);
      window.setTimeout(() => inputRef.current?.focus(), 0);
    }
  }, [open]);

  useEffect(() => {
    if (!open || !query.trim()) {
      setItems([]);
      return;
    }
    setLoading(true);
    const timeout = window.setTimeout(async () => {
      try {
        const result = await globalSearch(query.trim());
        setItems(result.items);
        setUnavailable(result.unavailable);
        setHighlighted(0);
      } catch {
        setItems([]);
      } finally {
        setLoading(false);
      }
    }, 150);
    return () => window.clearTimeout(timeout);
  }, [query, open]);

  const grouped = useMemo(() => {
    const byType = new Map<SearchEntityType, SearchResultItem[]>();
    for (const item of items) {
      const bucket = byType.get(item.type) ?? [];
      bucket.push(item);
      byType.set(item.type, bucket);
    }
    return byType;
  }, [items]);

  const select = (item: SearchResultItem) => {
    navigate(item.path);
    onOpenChange(false);
  };

  const onKeyDown = (event: React.KeyboardEvent) => {
    if (event.key === 'Escape') {
      onOpenChange(false);
      return;
    }
    if (event.key === 'ArrowDown') {
      event.preventDefault();
      setHighlighted((current) => Math.min(current + 1, items.length - 1));
      return;
    }
    if (event.key === 'ArrowUp') {
      event.preventDefault();
      setHighlighted((current) => Math.max(current - 1, 0));
      return;
    }
    if (event.key === 'Enter' && items[highlighted]) {
      select(items[highlighted]);
    }
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[60] flex items-start justify-center bg-slate-950/40 p-4 pt-[12vh] backdrop-blur-sm dark:bg-black/60">
      <button
        type="button"
        aria-label="Fechar busca"
        className="absolute inset-0"
        onClick={() => onOpenChange(false)}
      />
      <div className="relative w-full max-w-xl overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl dark:border-slate-700 dark:bg-slate-900">
        <div className="flex items-center gap-3 border-b border-slate-100 px-4 dark:border-slate-800">
          <Search size={16} className="text-slate-400" />
          <input
            ref={inputRef}
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            onKeyDown={onKeyDown}
            placeholder="Buscar cliente, produto, pedido, NF-e, boleto…"
            className="h-14 w-full bg-transparent text-sm outline-none placeholder:text-slate-400 dark:text-slate-100"
          />
          <kbd className="rounded-md border border-slate-200 px-1.5 py-0.5 text-[10px] font-bold text-slate-400 dark:border-slate-700">
            Esc
          </kbd>
        </div>

        <div className="max-h-[50vh] overflow-y-auto p-2">
          {loading && <p className="px-3 py-4 text-xs text-slate-400">Buscando…</p>}
          {!loading && query.trim() && items.length === 0 && (
            <p className="px-3 py-4 text-xs text-slate-400">
              Nada encontrado para &ldquo;{query}&rdquo;.
            </p>
          )}
          {!loading &&
            [...grouped.entries()].map(([type, group]) => {
              const Icon = TYPE_ICON[type];
              return (
                <div key={type} className="mb-2">
                  <p className="px-3 py-1 text-[10px] font-bold uppercase tracking-wide text-slate-400">
                    {TYPE_LABEL[type]}
                  </p>
                  {group.map((item) => {
                    const index = items.indexOf(item);
                    return (
                      <button
                        key={`${item.type}-${item.id}`}
                        type="button"
                        onClick={() => select(item)}
                        onMouseEnter={() => setHighlighted(index)}
                        className={`flex w-full items-center gap-3 rounded-xl px-3 py-2 text-left text-sm transition ${
                          index === highlighted
                            ? 'bg-blue-50 text-blue-900 dark:bg-blue-500/10 dark:text-blue-200'
                            : 'text-slate-700 hover:bg-slate-50 dark:text-slate-200 dark:hover:bg-slate-800'
                        }`}
                      >
                        <Icon size={16} className="shrink-0 text-slate-400" />
                        <span className="min-w-0 flex-1">
                          <span className="block truncate font-semibold">{item.title}</span>
                          <span className="block truncate text-xs text-slate-400">
                            {item.subtitle}
                          </span>
                        </span>
                      </button>
                    );
                  })}
                </div>
              );
            })}
          {!loading && !query.trim() && (
            <p className="px-3 py-4 text-xs text-slate-400">Digite para buscar.</p>
          )}
        </div>
        {unavailable.length > 0 && query.trim() && (
          <div className="border-t border-slate-100 px-4 py-2 text-[11px] text-slate-400 dark:border-slate-800">
            Busca por vendedor ainda não está disponível.
          </div>
        )}
      </div>
    </div>
  );
}
