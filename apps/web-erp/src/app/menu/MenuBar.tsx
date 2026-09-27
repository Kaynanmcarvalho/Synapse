/* eslint-disable max-lines-per-function */
import { ChevronDown, LogOut } from 'lucide-react';
import { type KeyboardEvent as EventoDeTeclado, useEffect, useRef, useState } from 'react';
import type { MenuPrincipal } from './menu.types';
import { moduloAtivoPara, moveuDeVerdade } from './menu.utils';
import { PainelDeMenu } from './PainelDeMenu';

/** Barra de menus no lugar e na ordem do Syndata, com comportamento de barra de
 *  desktop: com um menu aberto, passar o mouse nos vizinhos troca de menu; F10 leva
 *  o foco para a barra; setas navegam entre menus, itens e submenus; Esc fecha. */
export function MenuBar({
  menus,
  caminhoAtual,
  onSair,
  focarAntesDaBarra,
}: {
  readonly menus: readonly MenuPrincipal[];
  readonly caminhoAtual: string;
  readonly onSair: () => void;
  /** Shift+Tab saindo do primeiro modulo (Cadastros) volta para o que vem
   *  antes da barra na chrome — hoje o botao Ajuda. */
  readonly focarAntesDaBarra: () => void;
}) {
  const [aberto, setAberto] = useState<number | null>(null);
  const botoes = useRef<Array<HTMLButtonElement | null>>([]);
  const botaoSair = useRef<HTMLButtonElement | null>(null);
  const moduloAtivoId = moduloAtivoPara(menus, caminhoAtual);

  const indiceVizinho = (indice: number, direcao: 1 | -1) =>
    (indice + direcao + menus.length) % menus.length;

  useEffect(() => setAberto(null), [caminhoAtual]);

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

  /** Tab fecha o menu aberto e segue a ordem natural da pagina, como pede o
   *  padrao ARIA de menu button: o widget nao muda onde voce esta na
   *  sequencia de tabulacao, so fecha e deixa o Tab continuar. Por isso o
   *  destino e sempre relativo ao modulo aberto — nunca um alvo fixo fora da
   *  barra (isso seria teleportar o foco, o defeito que a Fase 3 corrige). */
  const sairComTab = (paraFrente: boolean) => {
    const indiceAtual = aberto;
    setAberto(null);
    if (indiceAtual === null) return;
    if (paraFrente) {
      if (indiceAtual < menus.length - 1) botoes.current[indiceAtual + 1]?.focus();
      else botaoSair.current?.focus();
    } else if (indiceAtual > 0) {
      botoes.current[indiceAtual - 1]?.focus();
    } else {
      focarAntesDaBarra();
    }
  };

  const aoTeclarNoBotao = (evento: EventoDeTeclado<HTMLButtonElement>, indice: number) => {
    const irPara = (destino: number) => {
      botoes.current[destino]?.focus();
      if (aberto !== null) setAberto(destino);
    };
    const tratar: Record<string, () => void> = {
      ArrowRight: () => irPara(indiceVizinho(indice, 1)),
      ArrowLeft: () => irPara(indiceVizinho(indice, -1)),
      Home: () => irPara(0),
      End: () => irPara(menus.length - 1),
      ArrowDown: () => setAberto(indice),
      Enter: () => setAberto(indice),
      ' ': () => setAberto(indice),
      Escape: () => {
        botoes.current[indice]?.focus();
        setAberto(null);
      },
    };
    const acao = tratar[evento.key];
    if (!acao) return;
    evento.preventDefault();
    acao();
  };

  const menuAberto = aberto !== null ? menus[aberto] : undefined;
  const ancora = aberto !== null ? botoes.current[aberto] : null;

  return (
    <nav aria-label="Menu principal" data-menubar="" className="flex h-full min-w-0 items-center">
      <div role="menubar" aria-label="Menu principal" className="flex h-full items-center">
        {menus.map((menu, indice) => {
          const estaAberto = aberto === indice;
          const ativo = menu.id === moduloAtivoId;
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
              onClick={() => setAberto(estaAberto ? null : indice)}
              onMouseEnter={(evento) => {
                if (aberto !== null && !estaAberto && moveuDeVerdade(evento)) setAberto(indice);
              }}
              onKeyDown={(evento) => aoTeclarNoBotao(evento, indice)}
              className={`text-button-sm focus-visible:ring-primary/70 duration-rapido group relative inline-flex h-full items-center gap-1 whitespace-nowrap px-3 outline-none transition-colors focus-visible:ring-2 focus-visible:ring-inset ${
                estaAberto || ativo ? 'text-ink' : 'text-charcoal hover:text-ink'
              }`}
            >
              {menu.rotulo}
              <ChevronDown
                size={12}
                aria-hidden="true"
                className={`duration-rapido text-stone transition-opacity ${
                  estaAberto
                    ? 'rotate-180 opacity-70'
                    : 'opacity-0 group-hover:opacity-60 group-focus-visible:opacity-60'
                }`}
              />
              {/* Linha de estado: cobalto = modulo da rota atual (fixa); neutra =
               *  aberto no momento. Nunca as duas ao mesmo tempo. */}
              <span
                aria-hidden="true"
                data-indicador-de-modulo=""
                className={`duration-rapido absolute inset-x-2.5 -bottom-px h-[2px] rounded-full transition-colors ${
                  ativo ? 'bg-primary' : estaAberto ? 'bg-line-media' : 'bg-transparent'
                }`}
              />
            </button>
          );
        })}
      </div>

      <span aria-hidden="true" className="bg-hairline-light mx-2 h-4 w-px" />
      <button
        ref={botaoSair}
        type="button"
        onClick={onSair}
        className="text-button-sm text-charcoal hover:text-accent-danger focus-visible:ring-primary/70 duration-rapido inline-flex h-full items-center gap-1.5 whitespace-nowrap px-3 outline-none transition-colors focus-visible:ring-2 focus-visible:ring-inset"
      >
        <LogOut size={14} aria-hidden="true" /> Sair
      </button>

      {menuAberto && ancora && (
        <PainelDeMenu
          key={menuAberto.id}
          entradas={menuAberto.itens}
          ancora={ancora}
          lado="abaixo"
          rotulo={menuAberto.rotulo}
          onFechar={(focarOrigem) => {
            if (focarOrigem) botoes.current[aberto as number]?.focus();
            setAberto(null);
          }}
          onFecharTudo={() => setAberto(null)}
          onTab={sairComTab}
          onTrocarMenu={(direcao) => {
            const destino = indiceVizinho(aberto as number, direcao);
            botoes.current[destino]?.focus();
            setAberto(destino);
          }}
        />
      )}
    </nav>
  );
}
