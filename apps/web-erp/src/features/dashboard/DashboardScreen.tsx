import { classesDaLinha, DataGridCabecalho, DataGridCelula, Text } from '@synapse/sdl';
import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { CelulaDeDinheiro } from '../../components/datagrid/CelulaDeDinheiro';
import { apiRequest } from '../../lib/dev-auth';

interface Totals {
  revenueCentavos: number;
  sales: number;
  averageTicketCentavos: number;
  commissionCentavos: number;
  customers: number;
}
interface Dashboard {
  ready: boolean;
  message?: string;
  calculatedAt: string;
  sales: Totals | null;
  monthlyGoalCentavos: number | null;
  branches: Array<
    Totals & {
      branchId: string;
      receivableCentavos?: number;
      payableCentavos?: number;
      overdueCentavos?: number;
    }
  >;
  stock: Array<{ branchId: string; available: number; outOfStock: number }>;
}
const money = (value: number) =>
  new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value / 100);

export function DashboardScreen() {
  const [profile, setProfile] = useState('admin');
  const [from, setFrom] = useState(() => new Date().toISOString().slice(0, 8) + '01');
  const [to, setTo] = useState(() => new Date().toISOString().slice(0, 10));
  const [branchId, setBranchId] = useState('');
  const [sellerId, setSellerId] = useState('');
  const [data, setData] = useState<Dashboard | null>(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const load = async () => {
    setLoading(true);
    setError('');
    setData(null);
    try {
      const query = new URLSearchParams({ from, to, profile });
      if (branchId.trim()) query.set('branchId', branchId.trim());
      if (sellerId.trim() && profile !== 'seller') query.set('sellerId', sellerId.trim());
      setData(await apiRequest<Dashboard>('/analytics/dashboard?' + query.toString()));
    } catch (cause) {
      setError((cause as Error).message);
    } finally {
      setLoading(false);
    }
  };
  useEffect(() => {
    void load();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps
  const totals = data?.sales;
  const cards = totals
    ? [
        ['Faturamento', money(totals.revenueCentavos)],
        ['Vendas', String(totals.sales)],
        ['Ticket médio', money(totals.averageTicketCentavos)],
        ['Clientes atendidos', String(totals.customers)],
        ...(profile === 'seller'
          ? [
              ['Comissão', money(totals.commissionCentavos)],
              ['Meta mensal', money(data?.monthlyGoalCentavos ?? 0)],
            ]
          : []),
      ]
    : [];
  return (
    <main className="mx-auto max-w-7xl space-y-6 p-4 sm:p-8">
      <header>
        <h1 className="text-3xl font-bold">Painel de Controle</h1>
        <p className="mt-2 text-sm text-slate-500">
          Resultados do período e posição atual de estoque e contas.
        </p>
      </header>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          void load();
        }}
        className="flex flex-wrap items-end gap-3 rounded-xl border bg-white p-4"
      >
        <label className="grid gap-1 text-sm">
          Perfil
          <select
            value={profile}
            onChange={(e) => setProfile(e.target.value)}
            className="rounded border bg-transparent p-2"
          >
            <option value="admin">Administrador</option>
            <option value="stock">Estoque</option>
            <option value="seller">Minhas vendas</option>
          </select>
        </label>
        <label className="grid gap-1 text-sm">
          De
          <input
            type="date"
            required
            value={from}
            onChange={(e) => setFrom(e.target.value)}
            className="rounded border bg-transparent p-2"
          />
        </label>
        <label className="grid gap-1 text-sm">
          Até
          <input
            type="date"
            required
            value={to}
            onChange={(e) => setTo(e.target.value)}
            className="rounded border bg-transparent p-2"
          />
        </label>
        <label className="grid gap-1 text-sm">
          Filial
          <input
            value={branchId}
            placeholder="Todas as permitidas"
            onChange={(e) => setBranchId(e.target.value)}
            className="w-40 rounded border bg-transparent p-2"
          />
        </label>
        {profile !== 'seller' && (
          <label className="grid gap-1 text-sm">
            Vendedor
            <input
              value={sellerId}
              placeholder="Todos"
              onChange={(e) => setSellerId(e.target.value)}
              className="w-40 rounded border bg-transparent p-2"
            />
          </label>
        )}
        <button
          disabled={loading}
          className="rounded bg-blue-600 px-4 py-2 text-white disabled:opacity-50"
        >
          {loading ? 'Carregando…' : 'Consultar'}
        </button>
      </form>
      {error && (
        <p role="alert" className="rounded bg-red-50 p-4 text-red-700">
          {error}
        </p>
      )}
      {data && !data.ready && <p role="status">{data.message}</p>}
      {data?.ready && (
        <>
          <p className="text-xs text-slate-500">
            Atualizado em {new Date(data.calculatedAt).toLocaleString('pt-BR')}. Atualização
            automática a cada 5 minutos.
          </p>
          <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            {cards.map(([label, value]) => (
              <article key={label} className="rounded-xl border bg-white p-5">
                <h2 className="text-sm text-slate-500">{label}</h2>
                <strong className="mt-2 block text-2xl">{value}</strong>
              </article>
            ))}
          </section>
          {data.branches.length > 0 && (
            <section>
              <h2 className="mb-3 text-lg font-bold">Comparativo entre filiais</h2>
              {/* Fase 5.4: só esta tabela migrou para a fundação de DataGrid.
               *  O resto da tela (filtros, cards, estoque) é redesign de tela,
               *  não de tabela — fica para a macrofase de Screens. */}
              <div className="overflow-x-auto">
                <table className="w-full min-w-[720px] border-collapse text-left">
                  <thead>
                    <tr className="border-hairline-light bg-surface-soft border-b">
                      <DataGridCabecalho id="filial" rotulo="Filial" />
                      <DataGridCabecalho id="vendas" rotulo="Vendas" alinhamento="direita" />
                      <DataGridCabecalho
                        id="faturamento"
                        rotulo="Faturamento"
                        alinhamento="direita"
                      />
                      <DataGridCabecalho id="receber" rotulo="A receber" alinhamento="direita" />
                      <DataGridCabecalho id="pagar" rotulo="A pagar" alinhamento="direita" />
                      <DataGridCabecalho id="vencidos" rotulo="Vencidos" alinhamento="direita" />
                    </tr>
                  </thead>
                  <tbody>
                    {data.branches.map((b) => (
                      <tr
                        key={b.branchId}
                        className={classesDaLinha({ clicavel: false, focoComAnel: false })}
                      >
                        <DataGridCelula papel="primary" truncar={false}>
                          <Text variant="corpo" className="font-medium">
                            {b.branchId}
                          </Text>
                        </DataGridCelula>
                        <DataGridCelula papel="data" alinhamento="direita" truncar={false}>
                          <Text variant="dado">{b.sales}</Text>
                        </DataGridCelula>
                        <CelulaDeDinheiro
                          truncar={false}
                          peso="forte"
                          valorFormatado={money(b.revenueCentavos)}
                        />
                        <CelulaDeDinheiro
                          truncar={false}
                          valorFormatado={money(b.receivableCentavos ?? 0)}
                        />
                        <CelulaDeDinheiro
                          truncar={false}
                          valorFormatado={money(b.payableCentavos ?? 0)}
                        />
                        <CelulaDeDinheiro
                          truncar={false}
                          peso={b.overdueCentavos ? 'normal' : 'apagado'}
                          valorFormatado={money(b.overdueCentavos ?? 0)}
                        />
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>
          )}
          {data.stock.length > 0 && (
            <section>
              <h2 className="mb-3 text-lg font-bold">Estoque atual</h2>
              <div className="grid gap-3 sm:grid-cols-2">
                {data.stock.map((b) => (
                  <article key={b.branchId} className="rounded-xl border p-4">
                    <strong>{b.branchId}</strong>
                    <p>{b.available} unidades disponíveis</p>
                    <p>{b.outOfStock} posições sem saldo</p>
                  </article>
                ))}
              </div>
              <Link
                to="/estoque/inteligencia"
                className="mt-3 inline-block text-blue-600 underline"
              >
                Ver curva ABC, giro e sugestões de compra
              </Link>
            </section>
          )}
          {!cards.length && !data.stock.length && (
            <p>Nenhum indicador disponível para o filtro selecionado.</p>
          )}
        </>
      )}
    </main>
  );
}
