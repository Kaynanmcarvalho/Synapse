/* eslint-disable max-lines-per-function */
import { ChevronDown, LogOut } from 'lucide-react';
import { type KeyboardEvent as EventoDeTeclado, useEffect, useRef, useState } from 'react';
import { useLocation } from 'react-router-dom';
import type { MenuPrincipal } from './menu.types';
import { PainelDeMenu } from './PainelDeMenu';

interface MenuAberto {
  readonly indice: number;
  /** Aberto pelo teclado: o foco ja entra no primeiro item. */
  readonly teclado: boolean;
}

/** Barra de menus no lugar e na ordem do Syndata, com comportamento de barra de
 *  desktop: com um menu aberto, passar o mouse nos vizinhos troca de menu; F10 leva
 *  o foco para a barra; setas navegam entre menus, itens e submenus; Esc fecha. */
export function MenuBar({
  menus,
  onSair,
}: {
  readonly menus: readonly MenuPrincipal[];
  readonly onSair: () => void;
}) {
  const [aberto, setAberto] = useState<MenuAberto | null>(null);
  const botoes = useRef<Array<HTMLButtonElement | null>>([]);
  const { pathname } = useLocation();

  const fechar = (focarOrigem = false) => {
    if (focarOrigem && aberto) botoes.current[aberto.indice]?.focus();
    setAberto(null);
  };

  const indiceVizinho = (indice: number, direcao: 1 | -1) =>
    (indice + direcao + menus.length) % menus.length;

  useEffect(() => setAberto(null), [pathname]);

  useEffect(() => {
    const aoApertarFora = (evento: PointerEvent) => {
      if (!(evento.target as Element | null)?.closest('[data-menubar]')) setAberto(null);
    };
    const aoTeclar = (evento: KeyboardEvent) => {
      // F10 e o atalho de Windows para ir a barra de menus.
      if (evento.key === 'F10' && !evento.shiftKey) {
        evento.preventDefault();
        botoes.current[0]?.focus();
      }
    };
    const aoRedimensionar = () => setAberto(null);

    document.addEventListener('pointerdown', aoApertarFora);
    document.addEventListener('keydown', aoTeclar);
    window.addEventListener('resize', aoRedimensionar);
    return () => {
      document.removeEventListener('pointerdown', aoApertarFora);
      document.removeEventListener('keydown', aoTeclar);
      window.removeEventListener('resize', aoRedimensionar);
    };
  }, []);

  const aoTeclarNoBotao = (evento: EventoDeTeclado<HTMLButtonElement>, indice: number) => {
    const irPara = (destino: number) => {
      botoes.current[destino]?.focus();
      if (aberto) setAberto({ indice: destino, teclado: true });
    };
    const tratar: Record<string, () => void> = {
      ArrowRight: () => irPara(indiceVizinho(indice, 1)),
      ArrowLeft: () => irPara(indiceVizinho(indice, -1)),
      Home: () => irPara(0),
      End: () => irPara(menus.length - 1),
      ArrowDown: () => setAberto({ indice, teclado: true }),
      Enter: () => setAberto({ indice, teclado: true }),
      ' ': () => setAberto({ indice, teclado: true }),
      Escape: () => fechar(true),
    };
    const acao = tratar[evento.key];
    if (!acao) return;
    evento.preventDefault();
    acao();
  };

  const menuAberto = aberto ? menus[aberto.indice] : undefined;
  const ancora = aberto ? botoes.current[aberto.indice] : null;

  return (
    <nav aria-label="Menu principal" data-menubar="" className="flex min-w-0 items-center">
      <div role="menubar" aria-label="Menu principal" className="flex items-center gap-0.5">
        {menus.map((menu, indice) => {
          const estaAberto = aberto?.indice === indice;
          return (
            <button
              key={menu.id}
              ref={(elemento) => {
                botoes.current[indice] = elemento;
              }}
              type="button"
              role="menuitem"
              aria-haspopup="menu"
              aria-expanded={estaAberto}
              onClick={() => setAberto(estaAberto ? null : { indice, teclado: false })}
              onMouseEnter={() => {
                if (aberto && !estaAberto) setAberto({ indice, teclado: false });
              }}
              onKeyDown={(evento) => aoTeclarNoBotao(evento, indice)}
              className={`inline-flex h-8 items-center gap-1 whitespace-nowrap rounded-lg px-2.5 text-[13px] font-medium outline-none transition-colors focus-visible:ring-2 focus-visible:ring-blue-500/40 ${
                estaAberto
                  ? 'bg-slate-100 text-slate-950 dark:bg-slate-800 dark:text-white'
                  : 'text-slate-600 hover:bg-slate-100 hover:text-slate-950 dark:text-slate-300 dark:hover:bg-slate-800 dark:hover:text-white'
              }`}
            >
              {menu.rotulo}
              <ChevronDown
                size={13}
                aria-hidden="true"
                className={`text-slate-400 transition-transform ${estaAberto ? 'rotate-180' : ''}`}
              />
            </button>
          );
        })}
      </div>

      <span aria-hidden="true" className="mx-2 h-5 w-px bg-slate-200 dark:bg-slate-700" />
      <button
        type="button"
        onClick={onSair}
        className="inline-flex h-8 items-center gap-1.5 whitespace-nowrap rounded-lg px-2.5 text-[13px] font-medium text-slate-600 outline-none transition-colors hover:bg-red-50 hover:text-red-700 focus-visible:ring-2 focus-visible:ring-blue-500/40 dark:text-slate-300 dark:hover:bg-red-500/10 dark:hover:text-red-300"
      >
        <LogOut size={14} aria-hidden="true" /> Sair
      </button>

      {menuAberto && aberto && ancora && (
        <PainelDeMenu
          key={menuAberto.id}
          entradas={menuAberto.itens}
          ancora={ancora}
          lado="abaixo"
          rotulo={menuAberto.rotulo}
          focarAoAbrir={aberto.teclado}
          onFechar={fechar}
          onFecharTudo={() => setAberto(null)}
          onTrocarMenu={(direcao) => {
            const destino = indiceVizinho(aberto.indice, direcao);
            botoes.current[destino]?.focus();
            setAberto({ indice: destino, teclado: true });
          }}
        />
      )}
    </nav>
  );
}
