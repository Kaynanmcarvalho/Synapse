/* eslint-disable max-lines-per-function */
import { useEffect, useState } from 'react';
import { Target, TrendingUp, Users, Wallet } from 'lucide-react';
import { getMyDashboard, getMyProfile, type Seller, type SellerDashboard } from './dashboard.api';

const money = (centavos: number) =>
  new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(centavos / 100);

export function DashboardScreen() {
  const [profile, setProfile] = useState<Seller | null>(null);
  const [dashboard, setDashboard] = useState<SellerDashboard | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    void (async () => {
      try {
        const [profileResult, dashboardResult] = await Promise.all([
          getMyProfile(),
          getMyDashboard(),
        ]);
        setProfile(profileResult);
        setDashboard(dashboardResult);
      } catch (cause) {
        setError((cause as Error).message);
      }
    })();
  }, []);

  if (error) {
    return (
      <main className="p-5">
        <p className="rounded-xl bg-rose-50 p-4 text-sm text-rose-700">{error}</p>
      </main>
    );
  }

  if (!profile || !dashboard) {
    return (
      <main className="p-5">
        <p className="text-sm text-slate-400">Carregando…</p>
      </main>
    );
  }

  const goalPercent = Math.min(dashboard.goalProgressPercent, 100);

  return (
    <main className="px-5 pb-6 pt-8">
      <p className="text-xs font-bold uppercase tracking-[0.18em] text-blue-600">Olá,</p>
      <h1 className="mt-1 text-2xl font-extrabold text-slate-950">{profile.name}</h1>
      <p className="mt-1 text-xs text-slate-500">
        {profile.region} {profile.route && `· rota ${profile.route}`}
      </p>

      <section className="mt-6 grid grid-cols-2 gap-3">
        <article className="rounded-2xl border border-white bg-white/90 p-4 shadow-[0_8px_24px_-16px_rgba(15,23,42,.25)]">
          <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600">
            <TrendingUp size={16} />
          </span>
          <p className="mt-3 text-[11px] font-semibold text-slate-500">Vendas hoje</p>
          <strong className="mt-1 block text-lg font-extrabold text-slate-950">
            {money(dashboard.salesTodayCentavos)}
          </strong>
        </article>
        <article className="rounded-2xl border border-white bg-white/90 p-4 shadow-[0_8px_24px_-16px_rgba(15,23,42,.25)]">
          <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-blue-50 text-blue-600">
            <TrendingUp size={16} />
          </span>
          <p className="mt-3 text-[11px] font-semibold text-slate-500">Vendas no mês</p>
          <strong className="mt-1 block text-lg font-extrabold text-slate-950">
            {money(dashboard.salesThisMonthCentavos)}
          </strong>
        </article>
        <article className="rounded-2xl border border-white bg-white/90 p-4 shadow-[0_8px_24px_-16px_rgba(15,23,42,.25)]">
          <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-amber-50 text-amber-600">
            <Wallet size={16} />
          </span>
          <p className="mt-3 text-[11px] font-semibold text-slate-500">Comissão no mês</p>
          <strong className="mt-1 block text-lg font-extrabold text-slate-950">
            {money(dashboard.commissionThisMonthCentavos)}
          </strong>
          <p className="mt-0.5 text-[10px] text-slate-400">
            {profile.commissionPercent}% sobre vendas
          </p>
        </article>
        <article className="rounded-2xl border border-white bg-white/90 p-4 shadow-[0_8px_24px_-16px_rgba(15,23,42,.25)]">
          <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-violet-50 text-violet-600">
            <Users size={16} />
          </span>
          <p className="mt-3 text-[11px] font-semibold text-slate-500">Clientes atendidos</p>
          <strong className="mt-1 block text-lg font-extrabold text-slate-950">
            {dashboard.customersServedThisMonth}
          </strong>
          <p className="mt-0.5 text-[10px] text-slate-400">no mês</p>
        </article>
      </section>

      <section className="mt-4 rounded-2xl border border-white bg-white/90 p-5 shadow-[0_8px_24px_-16px_rgba(15,23,42,.25)]">
        <div className="flex items-center gap-2 text-xs font-bold text-slate-700">
          <Target size={15} className="text-blue-600" /> Meta do mês
        </div>
        <div className="mt-3 flex items-center justify-between text-xs font-semibold text-slate-500">
          <span>{money(dashboard.salesThisMonthCentavos)}</span>
          <span>{money(dashboard.monthlyGoalCentavos)}</span>
        </div>
        <div className="mt-2 h-2.5 overflow-hidden rounded-full bg-slate-100">
          <div
            className="h-full rounded-full bg-gradient-to-r from-blue-600 to-cyan-400"
            style={{ width: `${goalPercent}%` }}
          />
        </div>
        <p className="mt-2 text-right text-[11px] font-bold text-blue-600">
          {dashboard.goalProgressPercent}% da meta
        </p>
      </section>

      {dashboard.pendingOrders > 0 && (
        <p className="mt-4 rounded-xl bg-amber-50 p-3 text-center text-xs font-semibold text-amber-700">
          Você tem {dashboard.pendingOrders} pedido(s) pendente(s)
        </p>
      )}
    </main>
  );
}
