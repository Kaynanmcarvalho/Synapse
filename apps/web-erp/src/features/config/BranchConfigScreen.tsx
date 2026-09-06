import { useState } from 'react';
import { CONFIG_DOMAINS, type ResolvedConfigValue } from '@synapse/types';
import { apiRequest } from '../../lib/dev-auth';

export function BranchConfigScreen() {
  const [branchId, setBranchId] = useState('');
  const [domain, setDomain] = useState<string>('precos');
  const [name, setName] = useState('margemPadrao');
  const [value, setValue] = useState('20');
  const [resolved, setResolved] = useState<ResolvedConfigValue<unknown> | null>(null);
  const [message, setMessage] = useState('');
  const [busy, setBusy] = useState(false);
  const path = `/iam/${branchId.trim() ? `branches/${encodeURIComponent(branchId.trim())}/` : ''}config/${encodeURIComponent(`${domain}.${name}`)}`;
  const act = async (method: 'GET' | 'PUT' | 'DELETE') => {
    setBusy(true);
    setMessage('');
    setResolved(null);
    try {
      if (method !== 'GET') {
        await apiRequest(path, {
          method,
          ...(method === 'PUT'
            ? {
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ value: JSON.parse(value) as unknown }),
              }
            : {}),
        });
      }
      const result = await apiRequest<ResolvedConfigValue<unknown>>(path);
      setResolved(result);
      setValue(JSON.stringify(result.value, null, 2));
      setMessage(
        method === 'DELETE'
          ? 'Sobrescrita removida. O valor voltou a ser herdado.'
          : 'Configuração carregada.',
      );
    } catch (error) {
      setMessage(
        error instanceof Error ? error.message : 'Não foi possível atualizar a configuração.',
      );
    } finally {
      setBusy(false);
    }
  };
  const reset = () => setResolved(null);
  return (
    <main className="mx-auto max-w-3xl space-y-5 p-4 sm:p-8">
      <h1 className="text-2xl font-bold">Configuração por filial</h1>
      <p>Consulte a origem de cada valor, configure a empresa ou sobrescreva uma filial.</p>
      <fieldset disabled={busy} className="grid gap-4 rounded-xl border p-5 disabled:opacity-60">
        <label>
          Filial (vazio para configuração global da empresa)
          <input
            className="mt-1 w-full rounded border bg-transparent p-2"
            value={branchId}
            onChange={(e) => {
              setBranchId(e.target.value);
              reset();
            }}
          />
        </label>
        <label>
          Domínio
          <select
            className="mt-1 w-full rounded border bg-white p-2 dark:bg-slate-900"
            value={domain}
            onChange={(e) => {
              setDomain(e.target.value);
              reset();
            }}
          >
            {CONFIG_DOMAINS.map((item) => (
              <option key={item}>{item}</option>
            ))}
          </select>
        </label>
        <label>
          Nome da configuração
          <input
            className="mt-1 w-full rounded border bg-transparent p-2"
            value={name}
            onChange={(e) => {
              setName(e.target.value);
              reset();
            }}
          />
        </label>
        <button type="button" className="rounded border p-2" onClick={() => void act('GET')}>
          Consultar valor e origem
        </button>
        {resolved && (
          <p className="rounded bg-blue-50 p-3 dark:bg-blue-950">
            Origem: <strong>{resolved.source}</strong> —{' '}
            {resolved.source === 'GLOBAL'
              ? 'definido na empresa'
              : resolved.source === 'INHERITED'
                ? 'herdado da empresa'
                : 'sobrescrito nesta filial'}
          </p>
        )}
        <label>
          Valor em JSON (exemplos: 20, true, &quot;texto&quot;)
          <textarea
            rows={4}
            className="mt-1 w-full rounded border bg-transparent p-2 font-mono"
            value={value}
            onChange={(e) => setValue(e.target.value)}
          />
        </label>
        <div className="flex flex-wrap gap-3">
          <button
            type="button"
            className="rounded bg-blue-600 px-4 py-2 text-white"
            onClick={() => void act('PUT')}
          >
            {branchId.trim() ? 'Salvar sobrescrita da filial' : 'Salvar valor global'}
          </button>
          {branchId.trim() && (
            <button
              type="button"
              className="rounded border px-4 py-2"
              onClick={() => void act('DELETE')}
            >
              Voltar ao valor herdado
            </button>
          )}
        </div>
      </fieldset>
      <p role="status">{busy ? 'Atualizando…' : message}</p>
    </main>
  );
}
