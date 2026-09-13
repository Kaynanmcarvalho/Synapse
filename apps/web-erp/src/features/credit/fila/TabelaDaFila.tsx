import type { PedidoNaFila } from '@synapse/types';
import { ArrowDown, ArrowUp } from 'lucide-react';
import {
  useEffect,
  useRef,
  useState,
  type DragEvent as EventoDeArrasto,
  type KeyboardEvent as EventoDeTecla,
  type PointerEvent as EventoDePonteiro,
} from 'react';
import { Celula } from './CelulaDaFila';
import { ALINHAMENTO, COLUNAS, limitarLargura, type IdDaColuna, type Ordenacao } from './colunas';

function Titulo({
  id,
  ordenacao,
  alvo,
  aoOrdenar,
  aoArrastar,
  aoSoltar,
  aoMirar,
  aoRedimensionar,
  aoRestaurarLargura,
}: {
  readonly id: IdDaColuna;
  readonly ordenacao: Ordenacao;
  readonly alvo: IdDaColuna | null;
  readonly aoOrdenar: (coluna: IdDaColuna) => void;
  readonly aoArrastar: (coluna: IdDaColuna, evento: EventoDeArrasto) => void;
  readonly aoSoltar: (coluna: IdDaColuna, evento: EventoDeArrasto) => void;
  readonly aoMirar: (coluna: IdDaColuna | null) => void;
  readonly aoRedimensionar: (coluna: IdDaColuna, evento: EventoDePonteiro) => void;
  readonly aoRestaurarLargura: (coluna: IdDaColuna) => void;
}) {
  const coluna = COLUNAS[id];
  const ordenada = ordenacao.coluna === id;
  const Seta = ordenacao.direcao === 'asc' ? ArrowUp : ArrowDown;

  return (
    <th
      scope="col"
      draggable
      onDragStart={(evento) => aoArrastar(id, evento)}
      onDragOver={(evento) => {
        evento.preventDefault();
        aoMirar(id);
      }}
      onDragLeave={() => aoMirar(null)}
      onDrop={(evento) => aoSoltar(id, evento)}
      onDoubleClick={() => aoOrdenar(id)}
      aria-sort={ordenada ? (ordenacao.direcao === 'asc' ? 'ascending' : 'descending') : 'none'}
      title={`Dois cliques ordenam ${coluna.criterio}. Arraste o título para mudar a ordem; arraste a divisão para mudar a largura.`}
      className={`text-caption text-stone relative cursor-grab select-none whitespace-nowrap px-3 py-2.5 font-semibold uppercase tracking-[0.06em] active:cursor-grabbing ${
        ALINHAMENTO[coluna.alinhamento]
      } ${alvo === id ? 'bg-hairline-light' : ''}`}
    >
      <span
        className={`inline-flex max-w-full items-center gap-1 ${
          coluna.alinhamento === 'direita' ? 'flex-row-reverse' : ''
        }`}
      >
        <span className={`truncate ${ordenada ? 'text-ink' : ''}`}>{coluna.rotulo}</span>
        {ordenada && <Seta size={11} aria-hidden="true" className="text-ink shrink-0" />}
      </span>

      {/* Divisao entre colunas: arrasta para largura, dois cliques devolve o padrao. */}
      <span
        role="separator"
        aria-orientation="vertical"
        aria-label={`Largura da coluna ${coluna.rotulo}`}
        draggable={false}
        onPointerDown={(evento) => {
          evento.stopPropagation();
          aoRedimensionar(id, evento);
        }}
        onDragStart={(evento) => evento.preventDefault()}
        onDoubleClick={(evento) => {
          evento.stopPropagation();
          aoRestaurarLargura(id);
        }}
        className="hover:bg-hairline-strong absolute inset-y-1 right-0 w-1.5 cursor-col-resize rounded-full transition"
      />
    </th>
  );
}

function Linha({
  linha,
  ordem,
  selecionada,
  aoSelecionar,
  aoAbrir,
  aoTeclar,
  aoAlternarImpressao,
}: {
  readonly linha: PedidoNaFila;
  readonly ordem: readonly IdDaColuna[];
  readonly selecionada: boolean;
  readonly aoSelecionar: () => void;
  readonly aoAbrir: () => void;
  readonly aoTeclar: (evento: EventoDeTecla<HTMLTableRowElement>) => void;
  readonly aoAlternarImpressao: () => void;
}) {
  return (
    <tr
      tabIndex={0}
      onClick={aoSelecionar}
      onDoubleClick={aoAbrir}
      onKeyDown={aoTeclar}
      aria-selected={selecionada}
      title="Um clique seleciona · dois cliques abrem a ficha do cliente"
      className={`border-hairline-light text-body-sm animate-revelar cursor-default border-b outline-none transition-colors duration-150 last:border-b-0 motion-reduce:animate-none ${
        selecionada
          ? 'bg-brand-50 ring-brand-200 relative z-[1] ring-1'
          : 'hover:bg-surface-soft focus-visible:bg-surface-soft'
      }`}
    >
      {ordem.map((id) => (
        <td
          key={id}
          className={`truncate whitespace-nowrap px-3 py-2 ${ALINHAMENTO[COLUNAS[id].alinhamento]}`}
        >
          <Celula coluna={id} linha={linha} aoAlternarImpressao={aoAlternarImpressao} />
        </td>
      ))}
    </tr>
  );
}

export interface PropsDaTabela {
  readonly linhas: readonly PedidoNaFila[];
  readonly ordem: readonly IdDaColuna[];
  readonly ordenacao: Ordenacao;
  readonly largura: (coluna: IdDaColuna) => number;
  readonly selecionado: string | null;
  readonly aoSelecionar: (linha: PedidoNaFila) => void;
  readonly aoAbrir: (linha: PedidoNaFila) => void;
  readonly aoOrdenar: (coluna: IdDaColuna) => void;
  readonly aoMover: (arrastada: IdDaColuna, alvo: IdDaColuna) => void;
  readonly aoRedimensionar: (coluna: IdDaColuna, largura: number) => void;
  readonly aoRestaurarLargura: (coluna: IdDaColuna) => void;
  readonly aoAlternarImpressao: (linha: PedidoNaFila) => void;
}

/** Enquanto arrasta a divisao, a largura vive aqui: gravar a cada pixel
 *  escreveria na preferencia o tempo todo. So o valor final e guardado. */
const usePrevia = (
  aoRedimensionar: (coluna: IdDaColuna, largura: number) => void,
): {
  readonly previa: { coluna: IdDaColuna; largura: number } | null;
  readonly iniciar: (coluna: IdDaColuna, evento: EventoDePonteiro, largura: number) => void;
} => {
  const [previa, setPrevia] = useState<{ coluna: IdDaColuna; largura: number } | null>(null);
  const arrasto = useRef<{ coluna: IdDaColuna; x: number; largura: number } | null>(null);
  const ultima = useRef<{ coluna: IdDaColuna; largura: number } | null>(null);

  useEffect(() => {
    const aoMover = (evento: PointerEvent) => {
      const atual = arrasto.current;
      if (!atual) return;
      const largura = limitarLargura(atual.largura + (evento.clientX - atual.x));
      ultima.current = { coluna: atual.coluna, largura };
      setPrevia(ultima.current);
    };
    const aoSoltar = () => {
      const atual = arrasto.current;
      const final = ultima.current;
      arrasto.current = null;
      ultima.current = null;
      if (!atual) return;
      document.body.style.removeProperty('cursor');
      setPrevia(null);
      if (final) aoRedimensionar(final.coluna, final.largura);
    };
    window.addEventListener('pointermove', aoMover);
    window.addEventListener('pointerup', aoSoltar);
    return () => {
      window.removeEventListener('pointermove', aoMover);
      window.removeEventListener('pointerup', aoSoltar);
    };
  }, [aoRedimensionar]);

  const iniciar = (coluna: IdDaColuna, evento: EventoDePonteiro, largura: number) => {
    if (evento.button !== 0) return;
    evento.preventDefault();
    arrasto.current = { coluna, x: evento.clientX, largura };
    document.body.style.setProperty('cursor', 'col-resize');
  };

  return { previa, iniciar };
};

export function TabelaDaFila(props: PropsDaTabela) {
  const { linhas, ordem, ordenacao, largura, selecionado } = props;
  const [alvo, setAlvo] = useState<IdDaColuna | null>(null);
  const { previa, iniciar } = usePrevia(props.aoRedimensionar);

  const larguraAtual = (id: IdDaColuna) => (previa?.coluna === id ? previa.largura : largura(id));

  const navegar = (evento: EventoDeTecla<HTMLTableRowElement>, linha: PedidoNaFila) => {
    if (evento.key === 'Enter') {
      evento.preventDefault();
      props.aoAbrir(linha);
      return;
    }
    if (evento.key !== 'ArrowDown' && evento.key !== 'ArrowUp') return;
    evento.preventDefault();
    const vizinha = (
      evento.key === 'ArrowDown'
        ? evento.currentTarget.nextElementSibling
        : evento.currentTarget.previousElementSibling
    ) as HTMLElement | null;
    vizinha?.focus();
    vizinha?.click();
  };

  return (
    <table className="w-full table-fixed border-collapse text-left">
      <colgroup>
        {ordem.map((id) => (
          <col key={id} style={{ width: larguraAtual(id) }} />
        ))}
      </colgroup>
      <thead className="sticky top-0 z-10">
        <tr className="border-hairline-light bg-surface-soft border-b">
          {ordem.map((id) => (
            <Titulo
              key={id}
              id={id}
              ordenacao={ordenacao}
              alvo={alvo}
              aoOrdenar={props.aoOrdenar}
              aoArrastar={(coluna, evento) => {
                evento.dataTransfer.setData('text/plain', coluna);
                evento.dataTransfer.effectAllowed = 'move';
              }}
              aoSoltar={(coluna, evento) => {
                evento.preventDefault();
                const arrastada = evento.dataTransfer.getData('text/plain') as IdDaColuna;
                if (arrastada) props.aoMover(arrastada, coluna);
                setAlvo(null);
              }}
              aoMirar={setAlvo}
              aoRedimensionar={(coluna, evento) => iniciar(coluna, evento, largura(coluna))}
              aoRestaurarLargura={props.aoRestaurarLargura}
            />
          ))}
        </tr>
      </thead>
      <tbody>
        {linhas.map((linha) => (
          <Linha
            key={linha.pedido.id}
            linha={linha}
            ordem={ordem}
            selecionada={linha.pedido.id === selecionado}
            aoSelecionar={() => props.aoSelecionar(linha)}
            aoAbrir={() => props.aoAbrir(linha)}
            aoTeclar={(evento) => navegar(evento, linha)}
            aoAlternarImpressao={() => props.aoAlternarImpressao(linha)}
          />
        ))}
      </tbody>
    </table>
  );
}
