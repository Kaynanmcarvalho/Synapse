import { Card, CardHeader, CardTitle } from '@synapse/ui';
import { useCallback, useEffect, useState } from 'react';
import { env } from '../lib/env';

type Consumption = {
  resource: string;
  used: number;
  limit: number;
  percentage: number;
  warning: boolean;
};
type Company = {
  tenantId: string;
  name: string;
  document: string;
  plan: 'BASIC' | 'PROFESSIONAL' | 'ENTERPRISE' | 'CUSTOM';
  status: 'trial' | 'active' | 'suspended';
  consumption: Consumption[];
  experience: {
    flags: Record<string, boolean>;
    branding: { systemName: string; primaryColor: string };
  };
};
type Metrics = {
  companies: number;
  activeCompanies: number;
  suspendedCompanies: number;
  users: number;
};

const labels: Record<string, string> = {
  users: 'Usuários',
  branches: 'Filiais',
  products: 'Produtos',
  fiscalDocuments: 'Notas',
  storageMb: 'Armazenamento',
  sellers: 'Vendedores',
};

function headers(): HeadersInit {
  const token = localStorage.getItem('synapse.adminToken');
  const tenantId = localStorage.getItem('synapse.tenantId');
  return {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...(tenantId ? { 'X-Tenant-ID': tenantId } : {}),
  };
}

// O painel permanece coeso enquanto os filtros e formulários de detalhe não viram rotas próprias.
// eslint-disable-next-line max-lines-per-function
export function App() {
  const [companies, setCompanies] = useState<Company[]>([]);
  const [metrics, setMetrics] = useState<Metrics | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const [companiesResponse, metricsResponse] = await Promise.all([
        fetch(`${env.apiUrl}/saas/companies`, { headers: headers() }),
        fetch(`${env.apiUrl}/saas/metrics`, { headers: headers() }),
      ]);
      if (!companiesResponse.ok || !metricsResponse.ok)
        throw new Error('Sessão de super admin necessária');
      setCompanies((await companiesResponse.json()) as Company[]);
      setMetrics((await metricsResponse.json()) as Metrics);
      setError(null);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Falha ao carregar o painel');
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  async function toggle(company: Company) {
    const status = company.status === 'suspended' ? 'active' : 'suspended';
    const response = await fetch(`${env.apiUrl}/saas/companies/${company.tenantId}`, {
      method: 'PATCH',
      headers: headers(),
      body: JSON.stringify({ status }),
    });
    if (!response.ok) {
      setError('Não foi possível alterar a empresa');
      return;
    }
    await load();
  }

  async function toggleFeature(company: Company, feature: string) {
    const response = await fetch(`${env.apiUrl}/saas/companies/${company.tenantId}/features`, {
      method: 'PATCH',
      headers: headers(),
      body: JSON.stringify({ feature, enabled: !company.experience.flags[feature] }),
    });
    if (!response.ok) {
      setError('Não foi possível alterar o módulo');
      return;
    }
    await load();
  }

  return (
    <main className="mx-auto min-h-full max-w-7xl space-y-6 p-6 lg:p-10">
      <header>
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-indigo-600">
          Synapse Admin
        </p>
        <h1 className="mt-1 text-3xl font-bold">Operação da plataforma</h1>
        <p className="mt-1 text-sm text-slate-500">
          Planos, consumo, limites e situação das empresas.
        </p>
      </header>

      {error ? (
        <div className="rounded-xl border border-amber-300 bg-amber-50 p-4 text-sm text-amber-900">
          {error}
        </div>
      ) : null}

      <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {[
          ['Empresas', metrics?.companies ?? '—'],
          ['Ativas', metrics?.activeCompanies ?? '—'],
          ['Suspensas', metrics?.suspendedCompanies ?? '—'],
          ['Usuários', metrics?.users ?? '—'],
        ].map(([label, value]) => (
          <Card key={label}>
            <p className="text-sm text-slate-500">{label}</p>
            <p className="mt-2 text-3xl font-bold">{value}</p>
          </Card>
        ))}
      </section>

      <Card>
        <CardHeader>
          <CardTitle>Empresas e consumo</CardTitle>
          <span className="text-xs text-slate-500">{companies.length} cadastradas</span>
        </CardHeader>
        <div className="mt-4 overflow-x-auto">
          <table className="w-full min-w-[850px] text-left text-sm">
            <thead className="border-b text-xs uppercase text-slate-500">
              <tr>
                <th className="py-3">Empresa</th>
                <th>Plano</th>
                <th>Status</th>
                <th>Recursos</th>
                <th className="text-right">Ação</th>
              </tr>
            </thead>
            <tbody>
              {companies.map((company) => (
                <tr
                  className="border-b border-slate-100 align-top dark:border-slate-800"
                  key={company.tenantId}
                >
                  <td className="py-4">
                    <strong>{company.name}</strong>
                    <div className="text-xs text-slate-500">{company.document}</div>
                  </td>
                  <td className="py-4">{company.plan}</td>
                  <td className="py-4">
                    <span
                      className={`rounded-full px-2 py-1 text-xs ${company.status === 'suspended' ? 'bg-rose-100 text-rose-700' : 'bg-emerald-100 text-emerald-700'}`}
                    >
                      {company.status}
                    </span>
                  </td>
                  <td className="grid grid-cols-2 gap-x-5 gap-y-1 py-4">
                    {company.consumption.map((item) => (
                      <span
                        className={item.warning ? 'font-semibold text-amber-700' : 'text-slate-600'}
                        key={item.resource}
                      >
                        {labels[item.resource]}: {item.used}/{item.limit} ({item.percentage}%)
                      </span>
                    ))}
                    <span className="col-span-2 mt-2 flex flex-wrap gap-1">
                      {Object.entries(company.experience.flags).map(([feature, enabled]) => (
                        <button
                          key={feature}
                          onClick={() => void toggleFeature(company, feature)}
                          className={`rounded px-1.5 py-0.5 text-[10px] font-bold ${enabled ? 'bg-indigo-100 text-indigo-700' : 'bg-slate-100 text-slate-400 line-through'}`}
                        >
                          {feature}
                        </button>
                      ))}
                    </span>
                  </td>
                  <td className="py-4 text-right">
                    <button
                      className="rounded-lg border px-3 py-2 font-medium hover:bg-slate-100 dark:hover:bg-slate-800"
                      onClick={() => void toggle(company)}
                    >
                      {company.status === 'suspended' ? 'Reativar' : 'Suspender'}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {!companies.length && !error ? (
            <p className="py-10 text-center text-slate-500">Nenhuma empresa cadastrada.</p>
          ) : null}
        </div>
      </Card>
    </main>
  );
}
