import { useState } from 'react';
import { Link } from 'react-router-dom';
import { apiRequest } from '../../lib/dev-auth';

export function CreateSuggestedPurchase({
  branchId,
  suggestionIds,
}: {
  readonly branchId: string;
  readonly suggestionIds: string[];
}) {
  const [warehouseId, setWarehouseId] = useState('');
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState('');
  const [created, setCreated] = useState(false);
  const create = async () => {
    setBusy(true);
    setCreated(false);
    setResult('');
    try {
      const order = await apiRequest<{ id: string }>('/purchasing/from-suggestions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ branchId, warehouseId, suggestionIds }),
      });
      setResult(`Pedido ${order.id} criado como rascunho para cotação.`);
      setCreated(true);
    } catch (error) {
      setResult((error as Error).message);
    } finally {
      setBusy(false);
    }
  };
  return (
    <section className="my-5 rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-700 dark:bg-slate-900">
      <h2 className="font-semibold">Gerar pedido das sugestões exibidas</h2>
      <p className="my-2 text-sm">
        {suggestionIds.length} produtos com quantidade positiva. Os ajustes aprovados serão usados.
      </p>
      <div className="flex flex-wrap gap-3">
        <input
          aria-label="Depósito de recebimento"
          placeholder="ID do depósito"
          value={warehouseId}
          onChange={(e) => {
            setWarehouseId(e.target.value);
            setCreated(false);
          }}
          className="rounded border bg-transparent p-2"
        />
        <button
          type="button"
          onClick={() => void create()}
          disabled={busy || created || !warehouseId.trim() || !suggestionIds.length}
          className="rounded bg-blue-600 px-4 py-2 text-white disabled:opacity-50"
        >
          {busy ? 'Criando…' : 'Gerar pedido de compra'}
        </button>
      </div>
      <p role="status" className="mt-2 text-sm">
        {result}
      </p>
      {created && (
        <Link to="/compras" className="text-blue-600 underline">
          Abrir compras para revisar e cotar
        </Link>
      )}
    </section>
  );
}
