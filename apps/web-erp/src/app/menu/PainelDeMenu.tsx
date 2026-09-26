/* eslint-disable max-lines-per-function */
import { Kbd } from '@synapse/sdl';
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
import { IconeDoMenuItem } from './IconeDoMenu';
import {
  familiaDoPainel,
  indiceDoTypeAhead,
  LARGURA_DO_PAINEL,
  moveuDeVerdade,
  proximoIndice,
} from './menu.utils';
import { type LadoDoPainel, usePosicaoFlutuante } from './usePosicaoFlutuante';

export interface PropsDoPainel {
  readonly entradas: readonly EntradaDeMenu[];
  readonly ancora: HTMLElement;
  readonly lado: LadoDoPainel;
  readonly rotulo: string;
  /** Fecha so este painel; `focarOrigem` devolve o foco a quem o abriu. */
  readonly onFechar: (focarOrigem: boolean) => void;
  /** Fecha a barra inteira: depois de navegar. */
  readonly onFecharTudo: () => void;
  /** Tab sai da barra inteira (mesmo callback em qualquer profundidade). */
  readonly onTab: (paraFrente: boolean) => void;
  /** Setas laterais no primeiro nivel trocam de menu, como numa barra de desktop. */
  readonly onTrocarMenu?: (direcao: 1 | -1) => void;
}

const ATRASO_PARA_FECHAR_SUBMENU_MS = 180;
const ATRASO_PARA_LIMPAR_TYPE_AHEAD_MS = 700;

const classeDaLinha = (destacado: boolean) =>
  `flex min-h-[32px] w-full items-center gap-2.5 rounded-pequeno px-2.5 py-1 text-left text-body-sm outline-none transition-colors duration-instantaneo ${
    destacado ? 'bg-surface-hover text-ink' : 'text-body'
  }`;

function ConteudoDoItem({ item }: { readonly item: ItemDeMenu }) {
  return (
    <>
      <IconeDoMenuItem icone={item.icone} />
      <span className="flex-1 leading-snug">{item.rotulo}</span>
      {item.situacao === 'em-breve' && (
        <span className="text-stone text-caption shrink-0">em breve</span>
      )}
      {item.atalho && <Kbd className="h-5 shrink-0 px-1.5 text-[11px]">{item.atalho.rotulo}</Kbd>}
    </>
  );
}

export function PainelDeMenu(props: PropsDoPainel) {
  const { entradas, ancora, lado, rotulo, onFechar, onFecharTudo, onTab, onTrocarMenu } = props;
  const painelRef = useRef<HTMLDivElement>(null);
  const [destaque, setDestaque] = useState<number | null>(null);
  const [submenuAberto, setSubmenuAberto] = useState<number | null>(null);
  const temporizadorDeFechar = useRef<number | null>(null);
  const typeAhead = useRef({ texto: '', ultimoToque: 0 });
  const estilo = usePosicaoFlutuante(ancora, painelRef, lado);
  const largura = LARGURA_DO_PAINEL[familiaDoPainel(entradas)];

  const elementoDo = useCallback(
    (indice: number) =>
      painelRef.current?.querySelector<HTMLElement>(`[data-indice="${indice}"]`) ?? null,
    [],
  );

  const cancelarFechamento = () => {
    if (temporizadorDeFechar.current !== null) window.clearTimeout(temporizadorDeFechar.current);
    temporizadorDeFechar.current = null;
  };

  // Ir do item ate o submenu na diagonal passa por cima de outros itens: um
  // atraso curto evita que o submenu feche no caminho.
  const agendarFechamentoDoSubmenu = () => {
    cancelarFechamento();
    temporizadorDeFechar.current = window.setTimeout(
      () => setSubmenuAberto(null),
      ATRASO_PARA_FECHAR_SUBMENU_MS,
    );
  };

  useEffect(() => cancelarFechamento, []);

  // O painel sempre chega com um item de verdade em destaque — nunca so o
  // container, que um leitor de tela leria como uma unica string enorme.
  useEffect(() => {
    setDestaque(proximoIndice(entradas, -1, 1));
  }, [entradas]);

  useEffect(() => {
    if (destaque !== null) elementoDo(destaque)?.focus();
  }, [destaque, elementoDo]);

  const aoTeclar = (evento: EventoDeTeclado<HTMLDivElement>) => {
    if (evento.key === 'Tab') {
      evento.preventDefault();
      evento.stopPropagation();
      onTab(!evento.shiftKey);
      return;
    }

    const atual = destaque ?? -1;
    const entrada = destaque !== null ? entradas[destaque] : undefined;
    const tratar: Record<string, () => void> = {
      ArrowDown: () => setDestaque(proximoIndice(entradas, atual, 1)),
      ArrowUp: () => setDestaque(proximoIndice(entradas, atual < 0 ? 0 : atual, -1)),
      Home: () => setDestaque(proximoIndice(entradas, -1, 1)),
      End: () => setDestaque(proximoIndice(entradas, 0, -1)),
      ArrowRight: () => {
        if (entrada?.tipo === 'submenu' && destaque !== null) {
          setSubmenuAberto(destaque);
        } else onTrocarMenu?.(1);
      },
      ArrowLeft: () => (lado === 'lateral' ? onFechar(true) : onTrocarMenu?.(-1)),
      Escape: () => onFechar(true),
      Enter: () => {
        if (entrada?.tipo === 'submenu' && destaque !== null) {
          setSubmenuAberto(destaque);
        } else if (destaque !== null) elementoDo(destaque)?.click();
      },
    };
    tratar[' '] = tratar['Enter'] as () => void;

    const acao = tratar[evento.key];
    if (acao) {
      evento.preventDefault();
      // Eventos do React atravessam o portal: sem isto o painel pai tambem reagiria.
      evento.stopPropagation();
      acao();
      return;
    }

    // Type-ahead: uma letra acha o proximo rotulo que comeca com ela; letras em
    // sequencia rapida (`cl`) refinam a busca. Acento nao importa.
    if (evento.key.length === 1 && evento.key !== ' ' && !evento.ctrlKey && !evento.metaKey) {
      const agora = Date.now();
      if (agora - typeAhead.current.ultimoToque > ATRASO_PARA_LIMPAR_TYPE_AHEAD_MS) {
        typeAhead.current.texto = '';
      }
      typeAhead.current.texto += evento.key;
      typeAhead.current.ultimoToque = agora;
      const indiceAchado = indiceDoTypeAhead(entradas, typeAhead.current.texto);
      if (indiceAchado !== -1) {
        evento.preventDefault();
        evento.stopPropagation();
        setDestaque(indiceAchado);
      }
    }
  };

  return createPortal(
    <div
      ref={painelRef}
      role="menu"
      aria-label={rotulo}
      tabIndex={-1}
      data-menubar=""
      style={{ ...estilo, width: largura }}
      onKeyDown={aoTeclar}
      onMouseEnter={cancelarFechamento}
      className="border-hairline-light bg-canvas-light shadow-menu-contido rounded-controle z-50 overflow-y-auto border p-1.5 outline-none"
    >
      {entradas.map((entrada, indice) => {
        if (entrada.tipo === 'separador') {
          return (
            <div key={entrada.id} role="separator" className="bg-hairline-light mx-2 my-1 h-px" />
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
              onMouseEnter={(evento) => {
                if (!moveuDeVerdade(evento)) return;
                setDestaque(indice);
                agendarFechamentoDoSubmenu();
              }}
              className={classeDaLinha(destaque === indice)}
            >
              <ConteudoDoItem item={entrada} />
            </Link>
          );
        }
        const aberto = submenuAberto === indice;
        return (
          <div key={entrada.id}>
            <button
              type="button"
              role="menuitem"
              aria-haspopup="menu"
              aria-expanded={aberto}
              tabIndex={-1}
              data-indice={indice}
              onClick={() => setSubmenuAberto(aberto ? null : indice)}
              onMouseEnter={(evento) => {
                if (!moveuDeVerdade(evento)) return;
                cancelarFechamento();
                setDestaque(indice);
                setSubmenuAberto(indice);
              }}
              className={classeDaLinha(destaque === indice || aberto)}
            >
              <IconeDoMenuItem icone={entrada.icone} />
              <span className="flex-1 leading-snug">{entrada.rotulo}</span>
              <ChevronRight size={14} className="text-stone shrink-0" aria-hidden="true" />
            </button>
            {aberto && elementoDo(indice) && (
              <PainelDeMenu
                entradas={entrada.itens}
                ancora={elementoDo(indice) as HTMLElement}
                lado="lateral"
                rotulo={entrada.rotulo}
                onFechar={(focarOrigem) => {
                  setSubmenuAberto(null);
                  // Estado, nao DOM direto: `elementoDo(indice)?.focus()` aqui
                  // desalinhava o destaque visual do foco real (o bug da seta
                  // lateral). O efeito acima refoca o elemento certo sozinho.
                  if (focarOrigem) setDestaque(indice);
                }}
                onFecharTudo={onFecharTudo}
                onTab={onTab}
              />
            )}
          </div>
        );
      })}
    </div>,
    document.body,
  );
}
