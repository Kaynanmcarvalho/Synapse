import { Maximize2, Minimize2, X } from 'lucide-react';
import {
  useEffect,
  useRef,
  useState,
  type PointerEvent as EventoDePonteiro,
  type ReactNode,
} from 'react';
import { createPortal } from 'react-dom';
import { usePreferencia } from '../../../lib/preferencias';
import {
  limitar,
  maximizar,
  mover,
  redimensionar,
  type Area,
  type Geometria,
  type Lado,
} from './geometria';
import { useAreaDaTela } from './useAreaDaTela';

type Acao = 'mover' | Lado;

interface Arrasto {
  readonly acao: Acao;
  readonly x: number;
  readonly y: number;
  readonly base: Geometria;
}

const PUNHO = 'absolute select-none touch-none';

function Punhos({
  aoIniciar,
}: {
  readonly aoIniciar: (acao: Acao) => (e: EventoDePonteiro) => void;
}) {
  return (
    <>
      <span
        aria-hidden="true"
        onPointerDown={aoIniciar('esquerda')}
        className={`${PUNHO} inset-y-0 left-0 w-2 cursor-ew-resize`}
      />
      <span
        aria-hidden="true"
        onPointerDown={aoIniciar('direita')}
        className={`${PUNHO} inset-y-0 right-0 w-2 cursor-ew-resize`}
      />
      <span
        aria-hidden="true"
        onPointerDown={aoIniciar('baixo')}
        className={`${PUNHO} inset-x-0 bottom-0 h-2 cursor-ns-resize`}
      />
      <span
        aria-hidden="true"
        onPointerDown={aoIniciar('baixo-esquerda')}
        className={`${PUNHO} bottom-0 left-0 h-4 w-4 cursor-nesw-resize`}
      />
      <span
        aria-hidden="true"
        onPointerDown={aoIniciar('baixo-direita')}
        className={`${PUNHO} bottom-0 right-0 h-4 w-4 cursor-nwse-resize`}
      />
    </>
  );
}

const BOTAO_DA_JANELA =
  'text-charcoal hover:bg-surface-soft flex h-9 w-9 shrink-0 items-center justify-center rounded-full transition';

function CabecalhoDaJanela({
  titulo,
  subtitulo,
  acoes,
  maximizada,
  podeMaximizar,
  aoArrastar,
  aoMaximizar,
  aoFechar,
}: {
  readonly titulo: string;
  readonly subtitulo?: string | undefined;
  readonly acoes?: ReactNode | undefined;
  readonly maximizada: boolean;
  readonly podeMaximizar: boolean;
  readonly aoArrastar?: ((evento: EventoDePonteiro) => void) | undefined;
  readonly aoMaximizar: () => void;
  readonly aoFechar: () => void;
}) {
  return (
    <header
      onPointerDown={aoArrastar}
      onDoubleClick={podeMaximizar ? aoMaximizar : undefined}
      className={`border-hairline-light flex shrink-0 items-center gap-3 border-b px-5 py-3 ${
        aoArrastar ? 'cursor-grab active:cursor-grabbing' : ''
      }`}
    >
      <span className="min-w-0 flex-1 select-none">
        <span className="font-display text-heading-sm text-ink block truncate">{titulo}</span>
        {subtitulo && <span className="text-body-sm text-stone block truncate">{subtitulo}</span>}
      </span>
      {acoes}
      {podeMaximizar && (
        <button
          type="button"
          onClick={aoMaximizar}
          aria-label={maximizada ? 'Restaurar janela' : 'Maximizar janela'}
          className={BOTAO_DA_JANELA}
        >
          {maximizada ? <Minimize2 size={16} /> : <Maximize2 size={16} />}
        </button>
      )}
      <button
        type="button"
        onClick={aoFechar}
        aria-label={`Fechar ${titulo}`}
        className={BOTAO_DA_JANELA}
      >
        <X size={17} />
      </button>
    </header>
  );
}

/** Enquanto o ponteiro esta pressionado, o movimento vale para a janela toda —
 *  por isso os ouvintes ficam na `window`, e nao no punho: a mao pode passar
 *  por cima de outra janela sem perder o arrasto. */
const useArrasto = (
  area: Area,
  aplicar: (geometria: Geometria) => void,
): { readonly iniciar: (acao: Acao, base: Geometria | null) => (e: EventoDePonteiro) => void } => {
  const arrasto = useRef<Arrasto | null>(null);

  useEffect(() => {
    const aoMover = (evento: PointerEvent) => {
      const atual = arrasto.current;
      if (!atual) return;
      const dx = evento.clientX - atual.x;
      const dy = evento.clientY - atual.y;
      aplicar(
        atual.acao === 'mover'
          ? mover(atual.base, dx, dy, area)
          : redimensionar(atual.base, atual.acao, dx, dy, area),
      );
    };
    const aoSoltar = () => {
      arrasto.current = null;
      document.body.style.removeProperty('user-select');
    };
    window.addEventListener('pointermove', aoMover);
    window.addEventListener('pointerup', aoSoltar);
    window.addEventListener('pointercancel', aoSoltar);
    return () => {
      window.removeEventListener('pointermove', aoMover);
      window.removeEventListener('pointerup', aoSoltar);
      window.removeEventListener('pointercancel', aoSoltar);
    };
  }, [area, aplicar]);

  const iniciar = (acao: Acao, base: Geometria | null) => (evento: EventoDePonteiro) => {
    if (!base || evento.button !== 0) return;
    evento.preventDefault();
    arrasto.current = { acao, x: evento.clientX, y: evento.clientY, base };
    document.body.style.setProperty('user-select', 'none');
  };

  return { iniciar };
};

interface Lembranca {
  readonly geometria: Geometria | null;
  readonly maximizada: boolean;
}

const SEM_LEMBRANCA: Lembranca = { geometria: null, maximizada: false };

/** Espera o arrasto assentar antes de gravar: arrastar grava uma vez, e nao a
 *  cada pixel. */
const ATRASO_PARA_GRAVAR_MS = 400;

/** Onde a janela esta e onde ela estava: a posicao e o tamanho voltam do jeito
 *  que o usuario deixou, por usuario e por janela. */
const useGeometriaDaJanela = (id: string, abertura: (area: Area) => Geometria) => {
  const { area, estreito } = useAreaDaTela();
  const [lembranca, lembrar] = usePreferencia<Lembranca>(`janela.${id}`, SEM_LEMBRANCA);
  const [geometria, setGeometria] = useState<Geometria | null>(null);
  const [maximizada, setMaximizada] = useState(lembranca.maximizada);
  const guardada = useRef<Geometria | null>(lembranca.geometria);

  useEffect(() => {
    setGeometria((atual) => {
      if (atual) return limitar(atual, area);
      if (lembranca.maximizada) return maximizar(area);
      return limitar(lembranca.geometria ?? abertura(area), area);
    });
  }, [area, abertura, lembranca.geometria, lembranca.maximizada]);

  // Espera o arrasto assentar: grava uma vez, e nao a cada pixel.
  useEffect(() => {
    if (!geometria || estreito) return;
    const temporizador = window.setTimeout(
      () => lembrar({ geometria: maximizada ? guardada.current : geometria, maximizada }),
      ATRASO_PARA_GRAVAR_MS,
    );
    return () => window.clearTimeout(temporizador);
  }, [geometria, maximizada, estreito, lembrar]);

  const alternarMaximizada = () => {
    if (maximizada) {
      setGeometria(guardada.current ?? abertura(area));
      setMaximizada(false);
      return;
    }
    guardada.current = geometria;
    setGeometria(maximizar(area));
    setMaximizada(true);
  };

  return { area, estreito, geometria, setGeometria, maximizada, alternarMaximizada };
};

export interface PropsDaJanela {
  /** Identidade da janela na memoria do usuario: mesma janela, mesmo canto. */
  readonly id: string;
  readonly titulo: string;
  readonly subtitulo?: string;
  /** Tamanho e canto de abertura, calculados a partir da area util da tela. */
  readonly abertura: (area: Area) => Geometria;
  readonly acoes?: ReactNode;
  readonly zIndex: number;
  /** So a janela da frente responde ao Esc — senao uma tecla fecharia todas. */
  readonly ativa: boolean;
  readonly aoFechar: () => void;
  readonly aoFocar: () => void;
  readonly children: ReactNode;
}

/** Janela flutuante: arrasta pelo cabecalho, estica pelas laterais e pelo pe,
 *  maximiza com dois cliques no titulo. Em tela estreita vira tela cheia — nao
 *  ha espaco para arrastar nada num celular. */
export function Janela({
  id,
  titulo,
  subtitulo,
  abertura,
  acoes,
  zIndex,
  ativa,
  aoFechar,
  aoFocar,
  children,
}: PropsDaJanela) {
  const { area, estreito, geometria, setGeometria, maximizada, alternarMaximizada } =
    useGeometriaDaJanela(id, abertura);
  const { iniciar } = useArrasto(area, setGeometria);

  useEffect(() => {
    if (!ativa) return;
    const aoTeclar = (evento: KeyboardEvent) => {
      if (evento.key === 'Escape') aoFechar();
    };
    document.addEventListener('keydown', aoTeclar);
    return () => document.removeEventListener('keydown', aoTeclar);
  }, [ativa, aoFechar]);

  const estilo =
    estreito || !geometria
      ? { top: area.topo, left: 0, right: 0, bottom: 0, zIndex }
      : {
          top: geometria.y,
          left: geometria.x,
          width: geometria.largura,
          height: geometria.altura,
          zIndex,
        };

  const podeArrastar = !estreito && !maximizada;

  return createPortal(
    <section
      role="dialog"
      aria-label={titulo}
      onPointerDownCapture={aoFocar}
      style={{ position: 'fixed', ...estilo }}
      className="border-hairline-light bg-canvas-light flex flex-col overflow-hidden rounded-2xl border shadow-xl"
    >
      <CabecalhoDaJanela
        titulo={titulo}
        subtitulo={subtitulo}
        acoes={acoes}
        maximizada={maximizada}
        podeMaximizar={!estreito}
        aoArrastar={podeArrastar ? iniciar('mover', geometria) : undefined}
        aoMaximizar={alternarMaximizada}
        aoFechar={aoFechar}
      />

      <div className="min-h-0 flex-1 overflow-auto">{children}</div>

      {podeArrastar && <Punhos aoIniciar={(acao) => iniciar(acao, geometria)} />}
    </section>,
    document.body,
  );
}
