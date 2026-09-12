import { ChevronDown, LogOut, X } from 'lucide-react';
import { useState } from 'react';
import { Link } from 'react-router-dom';
import type { EntradaDeMenu, MenuPrincipal } from './menu.types';

/** Uma barra de nove menus nao cabe no celular: aqui os mesmos menus, na mesma
 *  ordem, viram uma lista sanfonada. */
function ListaDeEntradas({
  entradas,
  nivel,
  onNavegar,
}: {
  readonly entradas: readonly EntradaDeMenu[];
  readonly nivel: number;
  readonly onNavegar: () => void;
}) {
  const [abertos, setAbertos] = useState<ReadonlySet<string>>(new Set());
  const alternar = (id: string) =>
    setAbertos((atual) => {
      const proximo = new Set(atual);
      if (proximo.has(id)) proximo.delete(id);
      else proximo.add(id);
      return proximo;
    });

  return (
    <ul className={nivel > 0 ? 'ml-3 border-l border-slate-100 pl-2 dark:border-slate-800' : ''}>
      {entradas.map((entrada) => {
        if (entrada.tipo === 'separador') return null;
        if (entrada.tipo === 'item') {
          return (
            <li key={entrada.id}>
              <Link
                to={entrada.caminho}
                onClick={onNavegar}
                className="flex min-h-10 items-center gap-2 rounded-lg px-3 py-2 text-[13px] text-slate-700 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800"
              >
                <span className="flex-1">{entrada.rotulo}</span>
                {entrada.situacao === 'em-breve' && (
                  <span className="rounded-md bg-slate-100 px-1.5 py-px text-[10px] text-slate-400 dark:bg-slate-800">
                    em breve
                  </span>
                )}
              </Link>
            </li>
          );
        }
        const aberto = abertos.has(entrada.id);
        return (
          <li key={entrada.id}>
            <button
              type="button"
              aria-expanded={aberto}
              onClick={() => alternar(entrada.id)}
              className="flex min-h-10 w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-[13px] font-medium text-slate-700 hover:bg-slate-100 dark:text-slate-200 dark:hover:bg-slate-800"
            >
              <span className="flex-1">{entrada.rotulo}</span>
              <ChevronDown
                size={14}
                aria-hidden="true"
                className={`text-slate-400 transition-transform ${aberto ? 'rotate-180' : ''}`}
              />
            </button>
            {aberto && (
              <ListaDeEntradas entradas={entrada.itens} nivel={nivel + 1} onNavegar={onNavegar} />
            )}
          </li>
        );
      })}
    </ul>
  );
}

export function MobileMenu({
  menus,
  onFechar,
  onSair,
}: {
  readonly menus: readonly MenuPrincipal[];
  readonly onFechar: () => void;
  readonly onSair: () => void;
}) {
  const principais = menus.map((menu) => ({
    tipo: 'submenu' as const,
    id: menu.id,
    rotulo: menu.rotulo,
    itens: menu.itens,
  }));

  return (
    <div className="fixed inset-0 z-50 lg:hidden">
      <button
        type="button"
        aria-label="Fechar menu"
        className="absolute inset-0 bg-slate-950/35 backdrop-blur-sm"
        onClick={onFechar}
      />
      <aside className="relative flex h-full w-[300px] max-w-[85vw] flex-col bg-white shadow-2xl dark:bg-slate-900">
        <div className="flex h-14 items-center justify-between border-b border-slate-100 px-4 dark:border-slate-800">
          <strong className="text-sm font-bold text-slate-900 dark:text-white">Menu</strong>
          <button
            type="button"
            aria-label="Fechar menu"
            onClick={onFechar}
            className="flex h-9 w-9 items-center justify-center rounded-full text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
          >
            <X size={18} />
          </button>
        </div>
        <nav aria-label="Menu principal" className="flex-1 overflow-y-auto p-2">
          <ListaDeEntradas entradas={principais} nivel={0} onNavegar={onFechar} />
        </nav>
        <div className="border-t border-slate-100 p-2 dark:border-slate-800">
          <button
            type="button"
            onClick={onSair}
            className="flex min-h-10 w-full items-center gap-2 rounded-lg px-3 text-[13px] font-medium text-red-600 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-500/10"
          >
            <LogOut size={15} aria-hidden="true" /> Sair
          </button>
        </div>
      </aside>
    </div>
  );
}
