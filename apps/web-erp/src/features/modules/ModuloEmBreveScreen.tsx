import { ArrowLeft, ChevronRight, Construction } from 'lucide-react';
import { Link, useLocation } from 'react-router-dom';
import { MENUS } from '../../app/menu/menu.data';
import { encontrarPorCaminho } from '../../app/menu/menu.utils';
import { ROTAS } from '../../app/rotas';

/** Destino das opcoes do menu que ainda nao tem tela. A opcao continua no mesmo
 *  lugar do Syndata; aqui ela diz onde mora e que ainda esta a caminho, em vez de
 *  cair numa pagina em branco ou num 404. */
export function ModuloEmBreveScreen() {
  const { pathname } = useLocation();
  const item = encontrarPorCaminho(MENUS, pathname);

  return (
    <main className="mx-auto flex max-w-3xl flex-col gap-6 px-4 py-10 sm:px-6 lg:px-8">
      {item && (
        <nav
          aria-label="Localização no menu"
          className="flex flex-wrap items-center gap-1 text-xs text-slate-400"
        >
          {item.trilha.map((parte, indice) => (
            <span key={`${parte}-${indice}`} className="flex items-center gap-1">
              {indice > 0 && <ChevronRight size={12} aria-hidden="true" />}
              <span
                className={
                  indice === item.trilha.length - 1
                    ? 'font-semibold text-slate-600 dark:text-slate-300'
                    : ''
                }
              >
                {parte}
              </span>
            </span>
          ))}
        </nav>
      )}

      <section className="rounded-2xl border border-slate-200/80 bg-white p-8 shadow-sm dark:border-slate-800 dark:bg-slate-900">
        <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-amber-50 text-amber-600 dark:bg-amber-500/10 dark:text-amber-400">
          <Construction size={22} aria-hidden="true" />
        </span>
        <h1 className="mt-5 text-xl font-extrabold tracking-[-0.02em] text-slate-950 dark:text-white">
          {item ? item.rotulo : 'Opção não encontrada'}
        </h1>
        <p className="mt-2 max-w-xl text-sm leading-relaxed text-slate-500 dark:text-slate-400">
          {item
            ? 'Esta rotina já tem lugar no menu, no mesmo ponto em que ficava no Syndata, mas a tela ainda está em desenvolvimento no Synapse.'
            : 'Este endereço não corresponde a nenhuma opção do menu.'}
        </p>
        <Link
          to={ROTAS.visaoGeral}
          className="mt-6 inline-flex h-10 items-center gap-2 rounded-xl bg-slate-950 px-4 text-[13px] font-semibold text-white transition hover:bg-slate-800 dark:bg-white dark:text-slate-950 dark:hover:bg-slate-200"
        >
          <ArrowLeft size={15} aria-hidden="true" /> Voltar para a visão geral
        </Link>
      </section>
    </main>
  );
}
