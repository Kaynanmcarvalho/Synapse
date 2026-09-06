/* eslint-disable max-lines-per-function */
import { useEffect, useRef, useState } from 'react';
import { Bookmark, Plus, X } from 'lucide-react';
import {
  createSavedFilter,
  deleteSavedFilter,
  listSavedFilters,
  type SavedFilter,
} from './search.api';

/** §60 "filtros salvos por usuário" — genérico o bastante pra qualquer tela
 *  plugar: só entrega `filterState` (o que a tela já guarda como estado) e
 *  recebe de volta o que foi salvo pra aplicar de novo (`onApply`). */
export function SavedFiltersBar<T extends Record<string, unknown>>({
  screen,
  currentFilterState,
  onApply,
}: {
  readonly screen: string;
  readonly currentFilterState: T;
  readonly onApply: (state: T) => void;
}) {
  const [filters, setFilters] = useState<SavedFilter[]>([]);
  const [naming, setNaming] = useState(false);
  const [name, setName] = useState('');
  const [busy, setBusy] = useState(false);
  const nameInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (naming) nameInputRef.current?.focus();
  }, [naming]);

  const refresh = async () => {
    try {
      setFilters(await listSavedFilters(screen));
    } catch {
      setFilters([]);
    }
  };

  useEffect(() => {
    void refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [screen]);

  const save = async () => {
    if (!name.trim()) return;
    setBusy(true);
    try {
      await createSavedFilter(screen, name.trim(), currentFilterState);
      setName('');
      setNaming(false);
      await refresh();
    } finally {
      setBusy(false);
    }
  };

  const remove = async (id: string) => {
    setBusy(true);
    try {
      await deleteSavedFilter(id);
      await refresh();
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="flex flex-wrap items-center gap-1.5">
      {filters.map((filter) => (
        <span
          key={filter.id}
          className="group flex items-center gap-1 rounded-full bg-blue-50 py-1 pl-3 pr-1.5 text-[11px] font-bold text-blue-700 dark:bg-blue-500/10 dark:text-blue-300"
        >
          <button
            type="button"
            onClick={() => onApply(filter.filterState as T)}
            className="flex items-center gap-1"
          >
            <Bookmark size={11} /> {filter.name}
          </button>
          <button
            type="button"
            onClick={() => remove(filter.id)}
            disabled={busy}
            aria-label={`Remover filtro ${filter.name}`}
            className="flex h-4 w-4 items-center justify-center rounded-full text-blue-400 opacity-0 transition hover:bg-blue-100 hover:text-blue-700 group-hover:opacity-100 dark:hover:bg-blue-500/20"
          >
            <X size={10} />
          </button>
        </span>
      ))}

      {naming ? (
        <span className="flex items-center gap-1">
          <input
            ref={nameInputRef}
            value={name}
            onChange={(event) => setName(event.target.value)}
            onKeyDown={(event) => event.key === 'Enter' && save()}
            placeholder="nome do filtro"
            className="h-7 w-32 rounded-full border border-slate-200 px-2.5 text-[11px] outline-none focus:border-blue-500 dark:border-slate-700 dark:bg-slate-900"
          />
          <button
            type="button"
            onClick={save}
            disabled={busy || !name.trim()}
            className="h-7 rounded-full bg-slate-950 px-2.5 text-[11px] font-bold text-white disabled:opacity-40 dark:bg-white dark:text-slate-900"
          >
            Salvar
          </button>
        </span>
      ) : (
        <button
          type="button"
          onClick={() => setNaming(true)}
          className="flex items-center gap-1 rounded-full border border-dashed border-slate-300 px-2.5 py-1 text-[11px] font-bold text-slate-400 transition hover:border-blue-300 hover:text-blue-600 dark:border-slate-700 dark:hover:text-blue-300"
        >
          <Plus size={11} /> Salvar filtro atual
        </button>
      )}
    </div>
  );
}
