/* eslint-disable max-lines-per-function */
import { useMemo, useState, type ReactNode } from 'react';
import { ArrowDown, ArrowUp, ArrowUpDown, Columns3, Search } from 'lucide-react';

export interface DataTableColumn<T> {
  readonly key: string;
  readonly header: string;
  readonly render: (row: T) => ReactNode;
  readonly sortValue?: (row: T) => string | number;
  readonly align?: 'left' | 'right' | 'center';
  readonly defaultHidden?: boolean;
}

export interface DataTableProps<T> {
  readonly columns: ReadonlyArray<DataTableColumn<T>>;
  readonly rows: readonly T[];
  readonly rowKey: (row: T) => string;
  readonly filterValue?: (row: T) => string;
  readonly filterPlaceholder?: string;
  readonly emptyLabel?: string;
}

/** §60 "tabelas com ordenação, filtro e coluna configurável" — um componente
 *  genérico em vez de reimplementar isso em cada tela nova. Estado (ordem,
 *  filtro, colunas visíveis) fica só neste componente; quem usa passa dados
 *  já prontos e uma função de render por coluna. */
export function DataTable<T>({
  columns,
  rows,
  rowKey,
  filterValue,
  filterPlaceholder = 'Filtrar...',
  emptyLabel = 'Nenhum resultado.',
}: DataTableProps<T>) {
  const [filter, setFilter] = useState('');
  const [sort, setSort] = useState<{ key: string; direction: 'asc' | 'desc' } | null>(null);
  const [hiddenColumns, setHiddenColumns] = useState<Set<string>>(
    () => new Set(columns.filter((column) => column.defaultHidden).map((column) => column.key)),
  );
  const [columnsMenuOpen, setColumnsMenuOpen] = useState(false);

  const visibleColumns = columns.filter((column) => !hiddenColumns.has(column.key));

  const filtered = useMemo(() => {
    if (!filterValue || !filter.trim()) return rows;
    const term = filter.trim().toLocaleLowerCase('pt-BR');
    return rows.filter((row) => filterValue(row).toLocaleLowerCase('pt-BR').includes(term));
  }, [rows, filter, filterValue]);

  const sorted = useMemo(() => {
    if (!sort) return filtered;
    const column = columns.find((candidate) => candidate.key === sort.key);
    if (!column?.sortValue) return filtered;
    const factor = sort.direction === 'asc' ? 1 : -1;
    return [...filtered].sort((a, b) => {
      const va = column.sortValue!(a);
      const vb = column.sortValue!(b);
      if (va < vb) return -1 * factor;
      if (va > vb) return 1 * factor;
      return 0;
    });
  }, [filtered, sort, columns]);

  const toggleSort = (key: string) => {
    setSort((current) => {
      if (current?.key !== key) return { key, direction: 'asc' };
      if (current.direction === 'asc') return { key, direction: 'desc' };
      return null;
    });
  };

  const toggleColumn = (key: string) => {
    setHiddenColumns((current) => {
      const next = new Set(current);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  return (
    <div>
      <div className="flex items-center gap-2 border-b border-slate-100 p-3 dark:border-slate-800">
        {filterValue && (
          <div className="relative max-w-xs flex-1">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              value={filter}
              onChange={(event) => setFilter(event.target.value)}
              placeholder={filterPlaceholder}
              className="h-9 w-full rounded-lg border border-slate-200 pl-8 pr-3 text-xs outline-none focus:border-blue-500 dark:border-slate-700 dark:bg-slate-900"
            />
          </div>
        )}
        <div className="relative ml-auto">
          <button
            type="button"
            onClick={() => setColumnsMenuOpen((open) => !open)}
            className="flex h-9 items-center gap-1.5 rounded-lg border border-slate-200 px-3 text-[11px] font-bold text-slate-500 transition hover:bg-slate-50 dark:border-slate-700 dark:text-slate-400 dark:hover:bg-slate-800"
          >
            <Columns3 size={13} /> Colunas
          </button>
          {columnsMenuOpen && (
            <div className="absolute right-0 top-10 z-10 w-52 rounded-xl border border-slate-200 bg-white p-2 shadow-xl dark:border-slate-700 dark:bg-slate-900">
              {columns.map((column) => (
                <label
                  key={column.key}
                  className="flex items-center gap-2 rounded-lg px-2 py-1.5 text-xs text-slate-600 hover:bg-slate-50 dark:text-slate-300 dark:hover:bg-slate-800"
                >
                  <input
                    type="checkbox"
                    checked={!hiddenColumns.has(column.key)}
                    onChange={() => toggleColumn(column.key)}
                  />
                  {column.header}
                </label>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full min-w-[480px] text-left text-sm">
          <thead>
            <tr className="bg-slate-50/70 text-[10px] font-bold uppercase tracking-[0.12em] text-slate-400 dark:bg-slate-900/60">
              {visibleColumns.map((column) => (
                <th
                  key={column.key}
                  className={`px-4 py-2.5 ${column.align === 'right' ? 'text-right' : column.align === 'center' ? 'text-center' : 'text-left'}`}
                >
                  {column.sortValue ? (
                    <button
                      type="button"
                      onClick={() => toggleSort(column.key)}
                      className="inline-flex items-center gap-1 hover:text-slate-700 dark:hover:text-slate-200"
                    >
                      {column.header}
                      {sort?.key === column.key ? (
                        sort.direction === 'asc' ? (
                          <ArrowUp size={11} />
                        ) : (
                          <ArrowDown size={11} />
                        )
                      ) : (
                        <ArrowUpDown size={11} className="opacity-40" />
                      )}
                    </button>
                  ) : (
                    column.header
                  )}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
            {sorted.length === 0 && (
              <tr>
                <td
                  colSpan={visibleColumns.length}
                  className="px-4 py-8 text-center text-xs text-slate-400"
                >
                  {emptyLabel}
                </td>
              </tr>
            )}
            {sorted.map((row) => (
              <tr
                key={rowKey(row)}
                className="transition hover:bg-slate-50/80 dark:hover:bg-slate-800/60"
              >
                {visibleColumns.map((column) => (
                  <td
                    key={column.key}
                    className={`px-4 py-2.5 ${column.align === 'right' ? 'text-right' : column.align === 'center' ? 'text-center' : 'text-left'}`}
                  >
                    {column.render(row)}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
