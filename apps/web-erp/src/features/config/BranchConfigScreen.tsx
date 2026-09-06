import { useState } from 'react';
import { CONFIG_DOMAINS, type ResolvedConfigValue } from '@synapse/types';
import { apiRequest } from '../../lib/dev-auth';

function useBranchConfig() {
  const [branchId, setBranchId] = useState('');
  const [domain, setDomain] = useState<string>('precos');
  const [name, setName] = useState('margemPadrao');
  const [value, setValue] = useState('20');
  const [resolved, setResolved] = useState<ResolvedConfigValue<unknown> | null>(null);
  const [message, setMessage] = useState('');
  const [busy, setBusy] = useState(false);
  const path = `/iam/${branchId.trim() ? `branches/${encodeURIComponent(branchId.trim())}/` : ''}config/${encodeURIComponent(`${domain}.${name}`)}`;
  const reset = () => setResolved(null);

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

  return {
    branchId,
    setBranchId,
    domain,
    setDomain,
    name,
    setName,
    value,
    setValue,
    resolved,
    message,
    busy,
    act,
    reset,
  };
}

type BranchConfigForm = ReturnType<typeof useBranchConfig>;

function ConfigFields({ form }: { readonly form: BranchConfigForm }) {
  return (
    <>
      <label>
        Filial (vazio para configuração global da empresa)
        <input
          className="mt-1 w-full rounded border bg-transparent p-2"
          value={form.branchId}
          onChange={(e) => {
            form.setBranchId(e.target.value);
            form.reset();
          }}
        />
      </label>
      <label>
        Domínio
        <select
          className="mt-1 w-full rounded border bg-white p-2 dark:bg-slate-900"
          value={form.domain}
          onChange={(e) => {
            form.setDomain(e.target.value);
            form.reset();
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
          value={form.name}
          onChange={(e) => {
            form.setName(e.target.value);
            form.reset();
          }}
        />
      </label>
      <button type="button" className="rounded border p-2" onClick={() => void form.act('GET')}>
        Consultar valor e origem
      </button>
      {form.resolved && (
        <p className="rounded bg-blue-50 p-3 dark:bg-blue-950">
          Origem: <strong>{form.resolved.source}</strong> —{' '}
          {form.resolved.source === 'GLOBAL'
            ? 'definido na empresa'
            : form.resolved.source === 'INHERITED'
              ? 'herdado da empresa'
              : 'sobrescrito nesta filial'}
        </p>
      )}
    </>
  );
}

function ConfigActions({ form }: { readonly form: BranchConfigForm }) {
  return (
    <div className="flex flex-wrap gap-3">
      <button
        type="button"
        className="rounded bg-blue-600 px-4 py-2 text-white"
        onClick={() => void form.act('PUT')}
      >
        {form.branchId.trim() ? 'Salvar sobrescrita da filial' : 'Salvar valor global'}
      </button>
      {form.branchId.trim() && (
        <button
          type="button"
          className="rounded border px-4 py-2"
          onClick={() => void form.act('DELETE')}
        >
          Voltar ao valor herdado
        </button>
      )}
    </div>
  );
}

export function BranchConfigScreen() {
  const form = useBranchConfig();
  return (
    <main className="mx-auto max-w-3xl space-y-5 p-4 sm:p-8">
      <h1 className="text-2xl font-bold">Configuração por filial</h1>
      <p>Consulte a origem de cada valor, configure a empresa ou sobrescreva uma filial.</p>
      <fieldset
        disabled={form.busy}
        className="grid gap-4 rounded-xl border p-5 disabled:opacity-60"
      >
        <ConfigFields form={form} />
        <label>
          Valor em JSON (exemplos: 20, true, &quot;texto&quot;)
          <textarea
            rows={4}
            className="mt-1 w-full rounded border bg-transparent p-2 font-mono"
            value={form.value}
            onChange={(e) => form.setValue(e.target.value)}
          />
        </label>
        <ConfigActions form={form} />
      </fieldset>
      <p role="status">{form.busy ? 'Atualizando…' : form.message}</p>
    </main>
  );
}
