/* eslint-disable max-lines, max-lines-per-function */
import { Check, FileInput, LoaderCircle, PackageCheck, Upload } from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';
import {
  checkDfeItem,
  concludeDfe,
  importDfe,
  launchDfe,
  listDfe,
  type DfeEntry,
  type DfeItem,
} from './dfe.api';

const money = (cents: number) =>
  new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(cents / 100);

export function DfeScreen() {
  const [entries, setEntries] = useState<DfeEntry[]>([]);
  const [selectedKey, setSelectedKey] = useState<string | null>(null);
  const [drafts, setDrafts] = useState<Record<number, DfeItem>>({});
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const selected = entries.find((entry) => entry.nota.chaveDeAcesso === selectedKey) ?? null;

  const refresh = useCallback(async () => {
    const next = await listDfe();
    setEntries(next.items);
    if (!selectedKey && next.items[0]) setSelectedKey(next.items[0].nota.chaveDeAcesso);
  }, [selectedKey]);

  useEffect(() => {
    void refresh().catch((error: unknown) =>
      setMessage(error instanceof Error ? error.message : 'Não foi possível carregar os DF-e'),
    );
  }, [refresh]);

  useEffect(() => {
    if (selected)
      setDrafts(Object.fromEntries(selected.conferencia.itens.map((item) => [item.numero, item])));
  }, [selected]);

  const run = async (operation: () => Promise<unknown>, success: string) => {
    setBusy(true);
    setMessage(null);
    try {
      await operation();
      await refresh();
      setMessage(success);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Operação não concluída');
    } finally {
      setBusy(false);
    }
  };

  const confirmItem = (item: DfeItem) =>
    run(
      () =>
        checkDfeItem(selectedKey as string, item.numero, {
          productId: item.productId ?? '',
          quantidadeMilesimos: item.quantidadeMilesimos,
          custoUnitarioCentavos: item.custoUnitarioCentavos,
          lote: item.lote,
          validade: item.validade,
        }),
      `Item ${item.numero} conferido`,
    );

  const launchSelected = () => {
    if (!selected) return;
    const branchId = window.prompt('ID da filial');
    const warehouseId = window.prompt('ID do depósito');
    const supplierId = window.prompt('ID do fornecedor', selected.nota.emitente.cnpj);
    const defaultDueDate = window.prompt(
      'Vencimento quando o XML não tiver duplicatas (AAAA-MM-DD)',
      new Date().toISOString().slice(0, 10),
    );
    if (!branchId || !warehouseId || !supplierId || !defaultDueDate) {
      setMessage('Informe filial, depósito, fornecedor e vencimento para lançar a entrada.');
      return;
    }
    void run(
      () =>
        launchDfe(selected.nota.chaveDeAcesso, {
          branchId,
          warehouseId,
          supplierId,
          defaultDueDate,
        }),
      'Entrada lançada no estoque e financeiro',
    );
  };

  return (
    <main className="mx-auto max-w-[1500px] px-4 py-8 sm:px-6 lg:px-8">
      <header className="flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.18em] text-blue-600">
            Fiscal · DF-e
          </p>
          <h1 className="mt-2 text-3xl font-bold tracking-tight">Entrada por XML</h1>
          <p className="mt-2 text-sm text-slate-500">
            Confira cada item antes de movimentar estoque, custos e financeiro.
          </p>
        </div>
        <label className="inline-flex cursor-pointer items-center justify-center gap-2 rounded-xl bg-slate-950 px-5 py-3 text-sm font-bold text-white shadow-lg hover:bg-blue-700">
          <Upload size={17} /> Importar XML
          <input
            className="sr-only"
            type="file"
            accept=".xml,text/xml,application/xml"
            disabled={busy}
            onChange={(event) => {
              const file = event.target.files?.[0];
              if (file)
                void run(
                  async () => importDfe(await file.text()),
                  'XML importado para conferência',
                );
              event.target.value = '';
            }}
          />
        </label>
      </header>

      {message && (
        <div
          role="status"
          className="mt-5 rounded-xl border border-blue-100 bg-blue-50 px-4 py-3 text-sm font-medium text-blue-800"
        >
          {message}
        </div>
      )}

      <div className="mt-7 grid gap-6 lg:grid-cols-[320px_minmax(0,1fr)]">
        <aside className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="border-b border-slate-100 px-5 py-4">
            <h2 className="text-sm font-bold">Notas recebidas</h2>
            <p className="mt-1 text-xs text-slate-400">{entries.length} documento(s)</p>
          </div>
          <div className="divide-y divide-slate-100">
            {entries.map((entry) => (
              <button
                key={entry.nota.chaveDeAcesso}
                type="button"
                onClick={() => setSelectedKey(entry.nota.chaveDeAcesso)}
                className={`w-full p-4 text-left ${selectedKey === entry.nota.chaveDeAcesso ? 'bg-blue-50' : 'hover:bg-slate-50'}`}
              >
                <span className="flex items-center justify-between gap-2">
                  <strong className="truncate text-sm">NF-e {entry.nota.numero}</strong>
                  <span className="rounded-full bg-slate-100 px-2 py-1 text-[9px] font-bold">
                    {entry.conferencia.situacao}
                  </span>
                </span>
                <span className="mt-1 block truncate text-xs text-slate-500">
                  {entry.nota.emitente.nome}
                </span>
                <span className="mt-2 block text-sm font-bold">
                  {money(entry.nota.valorTotalCentavos)}
                </span>
              </button>
            ))}
            {entries.length === 0 && (
              <div className="p-8 text-center text-sm text-slate-400">
                <FileInput className="mx-auto mb-3" /> Importe um XML para começar.
              </div>
            )}
          </div>
        </aside>

        <section className="min-w-0 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
          {!selected ? (
            <div className="flex min-h-80 items-center justify-center text-sm text-slate-400">
              Selecione uma nota.
            </div>
          ) : (
            <>
              <div className="flex flex-col gap-3 border-b border-slate-100 px-6 py-5 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <h2 className="font-bold">{selected.nota.emitente.nome}</h2>
                  <p className="mt-1 text-xs text-slate-500">
                    CNPJ {selected.nota.emitente.cnpj} · NF-e {selected.nota.numero}
                  </p>
                </div>
                <div className="flex gap-2">
                  {selected.conferencia.situacao === 'PENDENTE' && (
                    <button
                      type="button"
                      disabled={busy}
                      onClick={() =>
                        void run(
                          () => concludeDfe(selected.nota.chaveDeAcesso),
                          'Conferência concluída',
                        )
                      }
                      className="rounded-xl border px-4 py-2 text-xs font-bold disabled:opacity-50"
                    >
                      Concluir conferência
                    </button>
                  )}
                  {selected.conferencia.situacao === 'CONFERIDA' && (
                    <button
                      type="button"
                      disabled={busy}
                      onClick={launchSelected}
                      className="flex items-center gap-2 rounded-xl bg-emerald-600 px-4 py-2 text-xs font-bold text-white disabled:opacity-50"
                    >
                      <PackageCheck size={16} /> Lançar entrada
                    </button>
                  )}
                </div>
              </div>
              <DfeItemsTable
                selected={selected}
                drafts={drafts}
                disabled={busy || selected.conferencia.situacao !== 'PENDENTE'}
                setDrafts={setDrafts}
                confirmItem={confirmItem}
              />
            </>
          )}
        </section>
      </div>
      {busy && (
        <div className="fixed bottom-6 right-6 flex items-center gap-2 rounded-xl bg-slate-950 px-4 py-3 text-sm text-white shadow-xl">
          <LoaderCircle className="animate-spin" size={17} /> Processando…
        </div>
      )}
    </main>
  );
}

function DfeItemsTable({
  selected,
  drafts,
  disabled,
  setDrafts,
  confirmItem,
}: {
  readonly selected: DfeEntry;
  readonly drafts: Record<number, DfeItem>;
  readonly disabled: boolean;
  readonly setDrafts: (value: Record<number, DfeItem>) => void;
  readonly confirmItem: (item: DfeItem) => Promise<void>;
}) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[900px] text-left text-sm">
        <thead className="bg-slate-50 text-[10px] font-bold uppercase text-slate-400">
          <tr>
            {['Item', 'Produto interno', 'Quantidade', 'Custo', 'Lote', 'Validade', ''].map(
              (title) => (
                <th key={title} className="px-4 py-3">
                  {title}
                </th>
              ),
            )}
          </tr>
        </thead>
        <tbody className="divide-y">
          {selected.conferencia.itens.map((original) => {
            const item = drafts[original.numero] ?? original;
            const update = (change: Partial<DfeItem>) =>
              setDrafts({ ...drafts, [item.numero]: { ...item, ...change } });
            const field = 'w-32 rounded-lg border border-slate-200 px-3 py-2';
            return (
              <tr key={item.numero}>
                <td className="px-4 py-3 font-bold">#{item.numero}</td>
                <td className="px-4 py-3">
                  <input
                    aria-label={`Produto ${item.numero}`}
                    value={item.productId ?? ''}
                    onChange={(event) => update({ productId: event.target.value })}
                    className={field}
                  />
                </td>
                <td className="px-4 py-3">
                  <input
                    aria-label={`Quantidade ${item.numero}`}
                    type="number"
                    value={item.quantidadeMilesimos}
                    onChange={(event) =>
                      update({ quantidadeMilesimos: Number(event.target.value) })
                    }
                    className={field}
                  />
                </td>
                <td className="px-4 py-3">
                  <input
                    aria-label={`Custo ${item.numero}`}
                    type="number"
                    value={item.custoUnitarioCentavos}
                    onChange={(event) =>
                      update({ custoUnitarioCentavos: Number(event.target.value) })
                    }
                    className={field}
                  />
                </td>
                <td className="px-4 py-3">
                  <input
                    aria-label={`Lote ${item.numero}`}
                    value={item.lote ?? ''}
                    onChange={(event) => update({ lote: event.target.value || null })}
                    className={field}
                  />
                </td>
                <td className="px-4 py-3">
                  <input
                    aria-label={`Validade ${item.numero}`}
                    type="date"
                    value={item.validade ?? ''}
                    onChange={(event) => update({ validade: event.target.value || null })}
                    className={field}
                  />
                </td>
                <td className="px-4 py-3">
                  <button
                    type="button"
                    disabled={disabled || !item.productId}
                    onClick={() => void confirmItem(item)}
                    className="flex items-center gap-1 rounded-lg bg-blue-600 px-3 py-2 text-xs font-bold text-white disabled:bg-slate-200"
                  >
                    <Check size={14} /> {original.conferido ? 'Revisar' : 'Conferir'}
                  </button>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
