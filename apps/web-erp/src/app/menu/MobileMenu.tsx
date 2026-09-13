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
    <ul className={nivel > 0 ? 'border-hairline-light ml-4 border-l pl-2' : ''}>
      {entradas.map((entrada) => {
        if (entrada.tipo === 'separador') return null;
        if (entrada.tipo === 'item') {
          return (
            <li key={entrada.id}>
              <Link
                to={entrada.caminho}
                onClick={onNavegar}
                className="text-body-sm text-body hover:bg-surface-soft flex min-h-11 items-center gap-2 rounded-xl px-3 py-2 transition"
              >
                <span className="flex-1">{entrada.rotulo}</span>
                {entrada.situacao === 'em-breve' && (
                  <span className="border-hairline-light text-stone rounded-full border px-2 py-px text-[11px] font-medium">
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
              className={`text-button-sm hover:bg-surface-soft flex min-h-11 w-full items-center gap-2 rounded-xl px-3 py-2 text-left transition ${
                aberto ? 'text-ink' : 'text-charcoal'
              }`}
            >
              <span className="flex-1">{entrada.rotulo}</span>
              <ChevronDown
                size={15}
                aria-hidden="true"
                className={`text-stone transition-transform ${aberto ? 'rotate-180' : ''}`}
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
        className="bg-canvas-dark/40 absolute inset-0 backdrop-blur-sm"
        onClick={onFechar}
      />
      <aside className="bg-canvas-light relative flex h-full w-[320px] max-w-[88vw] flex-col">
        <div className="border-hairline-light flex h-16 items-center justify-between border-b px-4">
          <strong className="font-display text-heading-sm text-ink">Menu</strong>
          <button
            type="button"
            aria-label="Fechar menu"
            onClick={onFechar}
            className="text-charcoal hover:bg-surface-soft flex h-10 w-10 items-center justify-center rounded-full transition"
          >
            <X size={19} />
          </button>
        </div>
        <nav aria-label="Menu principal" className="flex-1 overflow-y-auto p-2">
          <ListaDeEntradas entradas={principais} nivel={0} onNavegar={onFechar} />
        </nav>
        <div className="border-hairline-light border-t p-3">
          <button
            type="button"
            onClick={onSair}
            className="border-hairline-light text-button-md text-ink hover:border-accent-danger hover:text-accent-danger flex h-12 w-full items-center justify-center gap-2 rounded-full border transition"
          >
            <LogOut size={17} aria-hidden="true" /> Sair
          </button>
        </div>
      </aside>
    </div>
  );
}
