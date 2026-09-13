/* eslint-disable max-lines-per-function */
import { ChevronRight } from 'lucide-react';
import {
  type KeyboardEvent as EventoDeTeclado,
  useCallback,
  useEffect,
  useRef,
  useState,
} from 'react';
import { createPortal } from 'react-dom';
import { Link } from 'react-router-dom';
import type { EntradaDeMenu, ItemDeMenu } from './menu.types';
import { proximoIndice } from './menu.utils';
import { type LadoDoPainel, usePosicaoFlutuante } from './usePosicaoFlutuante';

export interface PropsDoPainel {
  readonly entradas: readonly EntradaDeMenu[];
  readonly ancora: HTMLElement;
  readonly lado: LadoDoPainel;
  readonly rotulo: string;
  readonly focarAoAbrir: boolean;
  /** Fecha so este painel; `focarOrigem` devolve o foco a quem o abriu. */
  readonly onFechar: (focarOrigem: boolean) => void;
  /** Fecha a barra inteira: depois de navegar ou ao sair com Tab. */
  readonly onFecharTudo: () => void;
  /** Setas laterais no primeiro nivel trocam de menu, como numa barra de desktop. */
  readonly onTrocarMenu?: (direcao: 1 | -1) => void;
}

const ATRASO_PARA_FECHAR_SUBMENU_MS = 180;

const classeDaLinha = (destacado: boolean) =>
  `flex h-9 w-full items-center gap-3 whitespace-nowrap rounded-xl px-3 text-left text-body-sm outline-none transition-colors ${
    destacado ? 'bg-surface-soft text-ink' : 'text-body'
  }`;

function ConteudoDoItem({ item }: { readonly item: ItemDeMenu }) {
  return (
    <>
      <span className="flex-1">{item.rotulo}</span>
      {item.situacao === 'em-breve' && (
        <span className="border-hairline-light bg-canvas-light text-stone rounded-full border px-2 py-px text-[11px] font-medium">
          em breve
        </span>
      )}
      {item.atalho && <kbd className="text-stone font-sans text-[12px]">{item.atalho.rotulo}</kbd>}
    </>
  );
}

export function PainelDeMenu(props: PropsDoPainel) {
  const { entradas, ancora, lado, rotulo, focarAoAbrir, onFechar, onFecharTudo, onTrocarMenu } =
    props;
  const painelRef = useRef<HTMLDivElement>(null);
  const [destaque, setDestaque] = useState<number | null>(null);
  const [submenuAberto, setSubmenuAberto] = useState<{ indice: number; teclado: boolean } | null>(
    null,
  );
  const temporizador = useRef<number | null>(null);
  const estilo = usePosicaoFlutuante(ancora, painelRef, lado);

  const elementoDo = useCallback(
    (indice: number) =>
      painelRef.current?.querySelector<HTMLElement>(`[data-indice="${indice}"]`) ?? null,
    [],
  );

  const cancelarFechamento = () => {
    if (temporizador.current !== null) window.clearTimeout(temporizador.current);
    temporizador.current = null;
  };

  // Ir do item ate o submenu na diagonal passa por cima de outros itens: um
  // atraso curto evita que o submenu feche no caminho.
  const agendarFechamentoDoSubmenu = () => {
    cancelarFechamento();
    temporizador.current = window.setTimeout(
      () => setSubmenuAberto(null),
      ATRASO_PARA_FECHAR_SUBMENU_MS,
    );
  };

  useEffect(() => cancelarFechamento, []);

  useEffect(() => {
    if (focarAoAbrir) setDestaque(proximoIndice(entradas, -1, 1));
    else painelRef.current?.focus();
  }, [entradas, focarAoAbrir]);

  useEffect(() => {
    if (destaque !== null) elementoDo(destaque)?.focus();
  }, [destaque, elementoDo]);

  const aoTeclar = (evento: EventoDeTeclado<HTMLDivElement>) => {
    const atual = destaque ?? -1;
    const entrada = destaque !== null ? entradas[destaque] : undefined;
    const tratar: Record<string, () => void> = {
      ArrowDown: () => setDestaque(proximoIndice(entradas, atual, 1)),
      ArrowUp: () => setDestaque(proximoIndice(entradas, atual < 0 ? 0 : atual, -1)),
      Home: () => setDestaque(proximoIndice(entradas, -1, 1)),
      End: () => setDestaque(proximoIndice(entradas, 0, -1)),
      ArrowRight: () => {
        if (entrada?.tipo === 'submenu' && destaque !== null) {
          setSubmenuAberto({ indice: destaque, teclado: true });
        } else onTrocarMenu?.(1);
      },
      ArrowLeft: () => (lado === 'lateral' ? onFechar(true) : onTrocarMenu?.(-1)),
      Escape: () => onFechar(true),
      Tab: onFecharTudo,
      Enter: () => {
        if (entrada?.tipo === 'submenu' && destaque !== null) {
          setSubmenuAberto({ indice: destaque, teclado: true });
        } else if (destaque !== null) elementoDo(destaque)?.click();
      },
    };
    tratar[' '] = tratar['Enter'] as () => void;

    const acao = tratar[evento.key];
    if (!acao) return;
    evento.preventDefault();
    // Eventos do React atravessam o portal: sem isto o painel pai tambem reagiria.
    evento.stopPropagation();
    acao();
  };

  return createPortal(
    <div
      ref={painelRef}
      role="menu"
      aria-label={rotulo}
      tabIndex={-1}
      data-menubar=""
      style={estilo}
      onKeyDown={aoTeclar}
      onMouseEnter={cancelarFechamento}
      className="border-hairline-light bg-canvas-light z-50 min-w-[280px] overflow-y-auto rounded-2xl border p-2 shadow-lg outline-none"
    >
      {entradas.map((entrada, indice) => {
        if (entrada.tipo === 'separador') {
          return (
            <div key={entrada.id} role="separator" className="bg-hairline-light mx-3 my-1.5 h-px" />
          );
        }
        if (entrada.tipo === 'item') {
          return (
            <Link
              key={entrada.id}
              to={entrada.caminho}
              role="menuitem"
              tabIndex={-1}
              data-indice={indice}
              onClick={onFecharTudo}
              onMouseEnter={() => {
                setDestaque(indice);
                agendarFechamentoDoSubmenu();
              }}
              className={classeDaLinha(destaque === indice)}
            >
              <ConteudoDoItem item={entrada} />
            </Link>
          );
        }
        const aberto = submenuAberto?.indice === indice;
        return (
          <div key={entrada.id}>
            <button
              type="button"
              role="menuitem"
              aria-haspopup="menu"
              aria-expanded={aberto}
              tabIndex={-1}
              data-indice={indice}
              onClick={() => setSubmenuAberto(aberto ? null : { indice, teclado: false })}
              onMouseEnter={() => {
                cancelarFechamento();
                setDestaque(indice);
                setSubmenuAberto({ indice, teclado: false });
              }}
              className={classeDaLinha(destaque === indice || aberto)}
            >
              <span className="flex-1">{entrada.rotulo}</span>
              <ChevronRight size={15} className="text-stone" aria-hidden="true" />
            </button>
            {aberto && elementoDo(indice) && (
              <PainelDeMenu
                entradas={entrada.itens}
                ancora={elementoDo(indice) as HTMLElement}
                lado="lateral"
                rotulo={entrada.rotulo}
                focarAoAbrir={submenuAberto.teclado}
                onFechar={(focarOrigem) => {
                  setSubmenuAberto(null);
                  if (focarOrigem) elementoDo(indice)?.focus();
                }}
                onFecharTudo={onFecharTudo}
              />
            )}
          </div>
        );
      })}
    </div>,
    document.body,
  );
}
