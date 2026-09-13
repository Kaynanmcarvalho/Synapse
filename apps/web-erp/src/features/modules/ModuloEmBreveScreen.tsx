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
    <main className="mx-auto flex w-full max-w-[1200px] flex-col px-4 py-10 sm:px-6 lg:px-8 lg:py-14">
      {item && (
        <nav
          aria-label="Localização no menu"
          className="text-body-sm text-stone flex flex-wrap items-center gap-1"
        >
          {item.trilha.map((parte, indice) => (
            <span key={`${parte}-${indice}`} className="flex items-center gap-1">
              {indice > 0 && <ChevronRight size={14} aria-hidden="true" />}
              <span className={indice === item.trilha.length - 1 ? 'text-ink font-semibold' : ''}>
                {parte}
              </span>
            </span>
          ))}
        </nav>
      )}

      <section className="border-hairline-light mt-6 max-w-2xl rounded-2xl border p-8 sm:p-10">
        <span className="bg-surface-soft text-accent-warning flex h-12 w-12 items-center justify-center rounded-full">
          <Construction size={22} aria-hidden="true" />
        </span>
        <h1 className="font-display text-heading-lg text-ink mt-6">
          {item ? item.rotulo : 'Opção não encontrada'}
        </h1>
        <p className="text-body-md text-mute mt-3">
          {item
            ? 'Esta rotina já tem lugar no menu, no mesmo ponto em que ficava no Syndata, mas a tela ainda está em desenvolvimento no Synapse.'
            : 'Este endereço não corresponde a nenhuma opção do menu.'}
        </p>
        <Link
          to={ROTAS.inicio}
          className="bg-canvas-dark text-button-md hover:bg-charcoal mt-8 inline-flex h-12 items-center gap-2 rounded-full px-7 text-white transition"
        >
          <ArrowLeft size={17} aria-hidden="true" /> Voltar ao início
        </Link>
      </section>
    </main>
  );
}
