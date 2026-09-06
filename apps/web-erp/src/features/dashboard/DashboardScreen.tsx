import {
  ArrowUpRight,
  Banknote,
  Boxes,
  PackageCheck,
  ReceiptText,
  ShoppingBag,
  TrendingUp,
  type LucideIcon,
} from 'lucide-react';

const money = (value: number) =>
  new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);

interface StatTile {
  readonly label: string;
  readonly value: string;
  readonly change: string;
  readonly icon: LucideIcon;
  readonly tint: string;
}

const STAT_TILES: readonly StatTile[] = [
  {
    label: 'Faturamento hoje',
    value: money(128_450),
    change: '+12,8%',
    icon: Banknote,
    tint: 'bg-blue-50 text-blue-600',
  },
  {
    label: 'Pedidos em aberto',
    value: '38',
    change: '12 para separar',
    icon: ShoppingBag,
    tint: 'bg-violet-50 text-violet-600',
  },
  {
    label: 'Itens com estoque baixo',
    value: '17',
    change: '4 críticos',
    icon: Boxes,
    tint: 'bg-amber-50 text-amber-600',
  },
  {
    label: 'Notas emitidas',
    value: '84',
    change: '100% autorizadas',
    icon: ReceiptText,
    tint: 'bg-emerald-50 text-emerald-600',
  },
];

const WEEKLY_SALES = [48, 64, 42, 78, 70, 92, 82];
const WEEKDAYS = ['Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb', 'Dom'];

function StatTiles() {
  return (
    <section className="mt-8 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
      {STAT_TILES.map((item) => (
        <article
          key={item.label}
          className="rounded-2xl border border-slate-200/70 bg-white p-5 shadow-[0_10px_35px_-24px_rgba(15,23,42,.3)]"
        >
          <div className="flex items-start justify-between">
            <p className="text-xs font-semibold text-slate-500">{item.label}</p>
            <span className={`flex h-10 w-10 items-center justify-center rounded-xl ${item.tint}`}>
              <item.icon size={19} />
            </span>
          </div>
          <strong className="mt-5 block text-2xl font-bold tracking-[-0.03em] text-slate-950">
            {item.value}
          </strong>
          <p className="mt-1.5 flex items-center gap-1 text-[11px] font-semibold text-slate-400">
            <TrendingUp size={12} /> {item.change}
          </p>
        </article>
      ))}
    </section>
  );
}

function WeeklySalesChart() {
  return (
    <article className="rounded-3xl border border-slate-200/70 bg-white p-6 shadow-[0_18px_50px_-32px_rgba(15,23,42,.3)]">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="font-bold text-slate-950">Vendas da semana</h2>
          <p className="mt-1 text-xs text-slate-400">Receita bruta por dia</p>
        </div>
        <span className="rounded-lg bg-slate-100 px-3 py-1.5 text-[10px] font-bold text-slate-500">
          Últimos 7 dias
        </span>
      </div>
      <div className="mt-8 flex h-52 items-end gap-3 sm:gap-5">
        {WEEKLY_SALES.map((height, index) => (
          <div
            key={index}
            className="group flex h-full flex-1 flex-col items-center justify-end gap-2"
          >
            <div className="relative w-full flex-1 rounded-xl bg-slate-50">
              <div
                className="absolute inset-x-0 bottom-0 rounded-xl bg-gradient-to-t from-blue-600 to-blue-400 transition group-hover:from-slate-950 group-hover:to-slate-700"
                style={{ height: `${height}%` }}
              />
            </div>
            <span className="text-[10px] font-semibold text-slate-400">{WEEKDAYS[index]}</span>
          </div>
        ))}
      </div>
    </article>
  );
}

function OperationalHealthCard() {
  return (
    <article className="overflow-hidden rounded-3xl bg-slate-950 p-6 text-white shadow-[0_24px_60px_-30px_rgba(15,23,42,.6)]">
      <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-emerald-400/15 text-emerald-300">
        <PackageCheck size={21} />
      </div>
      <p className="mt-8 text-xs font-bold uppercase tracking-[0.18em] text-slate-500">
        Saúde operacional
      </p>
      <strong className="mt-2 block text-4xl font-bold tracking-[-0.04em]">
        94<span className="text-lg text-slate-500">/100</span>
      </strong>
      <p className="mt-3 text-sm leading-6 text-slate-400">
        Estoque, faturamento e expedição operando dentro dos parâmetros.
      </p>
      <div className="mt-7 h-2 overflow-hidden rounded-full bg-white/10">
        <div className="h-full w-[94%] rounded-full bg-gradient-to-r from-emerald-400 to-cyan-300" />
      </div>
    </article>
  );
}

export function DashboardScreen() {
  return (
    <main className="mx-auto max-w-[1440px] px-5 py-8 sm:px-8 lg:px-10">
      <header className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.18em] text-blue-600">
            Domingo, 6 de setembro
          </p>
          <h1 className="mt-2 text-3xl font-bold tracking-[-0.04em] text-slate-950">
            Bom dia, Marina.
          </h1>
          <p className="mt-2 text-sm text-slate-500">Aqui está o pulso da sua operação hoje.</p>
        </div>
        <button className="flex h-11 items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 text-xs font-bold text-slate-700 shadow-sm transition hover:border-slate-300 hover:shadow-md">
          Ver relatório executivo <ArrowUpRight size={15} />
        </button>
      </header>

      <StatTiles />

      <section className="mt-5 grid gap-5 xl:grid-cols-[1.6fr_1fr]">
        <WeeklySalesChart />
        <OperationalHealthCard />
      </section>
    </main>
  );
}
