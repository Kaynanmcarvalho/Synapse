import type { AvaliacaoDoPedido, PedidoDeVenda, PermissoesDaDecisao } from '@synapse/types';
import type { AvaliacaoDoLote } from '@synapse/validation';
import { Check, Minus } from 'lucide-react';
import type { KeyboardEvent as EventoDeTecla, ReactNode } from 'react';
import { Cartao, Vazio } from './Cartao';
import { Tabela, type ColunaDaTabela } from './Tabela';
import {
  formatarMoeda,
  prazoDoPedido,
  ROTULO_DA_ORIGEM,
  ROTULO_DO_TIPO,
  tempoAguardando,
} from './analise';
import { pagamentoDoPedido } from './fila/filtros';
import { Motivos } from './ui/Etiquetas';
import { LiberacaoDoLote } from './ficha/LiberacaoDoLote';

const COLUNAS: readonly ColunaDaTabela[] = [
  { rotulo: '', alinhamento: 'centro', largura: '44px' },
  { rotulo: 'Pedido' },
  { rotulo: 'Motivo da análise' },
  { rotulo: 'Condição' },
  { rotulo: 'Valor comercial', alinhamento: 'direita' },
  { rotulo: 'Exposição', alinhamento: 'direita' },
  { rotulo: 'Vendedor' },
  { rotulo: 'Aguardando', alinhamento: 'direita' },
];

export function Caixa({
  estado,
  rotulo,
  aoAlternar,
}: {
  readonly estado: 'marcada' | 'desmarcada' | 'parcial';
  readonly rotulo: string;
  readonly aoAlternar: () => void;
}) {
  return (
    <button
      type="button"
      role="checkbox"
      aria-checked={estado === 'parcial' ? 'mixed' : estado === 'marcada'}
      aria-label={rotulo}
      onClick={(evento) => {
        evento.stopPropagation();
        aoAlternar();
      }}
      onDoubleClick={(evento) => evento.stopPropagation()}
      className={`inline-flex h-[18px] w-[18px] items-center justify-center rounded-md border transition duration-150 ${
        estado === 'desmarcada'
          ? 'border-hairline-strong/40 bg-canvas-light hover:border-hairline-strong'
          : 'border-canvas-dark bg-canvas-dark text-white'
      }`}
    >
      {estado === 'marcada' && <Check size={12} strokeWidth={3} aria-hidden="true" />}
      {estado === 'parcial' && <Minus size={12} strokeWidth={3} aria-hidden="true" />}
    </button>
  );
}

/** Espaco marca, Enter abre — como na fila. */
const teclasDaLinha =
  (aoAlternar: () => void, aoAbrir: () => void) => (evento: EventoDeTecla<HTMLTableRowElement>) => {
    if (evento.key !== ' ' && evento.key !== 'Enter') return;
    evento.preventDefault();
    if (evento.key === ' ') aoAlternar();
    else aoAbrir();
  };

function Td({
  children,
  direita = false,
}: {
  readonly children: ReactNode;
  readonly direita?: boolean;
}) {
  return (
    <td className={`px-3 py-2 align-top ${direita ? 'text-right' : 'text-left'}`}>{children}</td>
  );
}

/** As colunas de dado da linha: o pedido, o motivo, a condicao, o dinheiro
 *  (valor comercial e exposicao, separados), o vendedor e a espera. */
function Dados({
  pedido,
  avaliacao,
}: {
  readonly pedido: PedidoDeVenda;
  readonly avaliacao: AvaliacaoDoPedido | undefined;
}) {
  const exposicao = avaliacao?.exposicao.exposicaoCentavos ?? null;
  return (
    <>
      <Td>
        <span className="text-body-sm text-ink block font-semibold tabular-nums">
          {pedido.numero}
        </span>
        <span className="text-caption text-stone block whitespace-nowrap">
          {ROTULO_DO_TIPO[pedido.tipo]} · {ROTULO_DA_ORIGEM[pedido.origem]}
        </span>
      </Td>
      <Td>{avaliacao ? <Motivos motivos={avaliacao.motivos} maximo={2} /> : '—'}</Td>
      <Td>
        <span className="text-body-sm text-charcoal block whitespace-nowrap">
          {pagamentoDoPedido(pedido)}
        </span>
        <span className="text-caption text-stone block">
          prazo {prazoDoPedido(pedido).toLowerCase()}
        </span>
      </Td>
      <Td direita>
        <span className="text-body-sm text-ink font-semibold tabular-nums">
          {formatarMoeda(pedido.totalCentavos)}
        </span>
      </Td>
      <Td direita>
        <span
          className={`text-body-sm tabular-nums ${exposicao ? 'text-ink font-semibold' : 'text-stone'}`}
          title={avaliacao?.exposicao.explicacao}
        >
          {exposicao === null ? '—' : formatarMoeda(exposicao)}
        </span>
      </Td>
      <Td>
        <span className="text-body-sm text-charcoal block max-w-[160px] truncate">
          {pedido.vendedorNome}
        </span>
      </Td>
      <Td direita>
        <span className="text-body-sm text-charcoal whitespace-nowrap tabular-nums">
          {tempoAguardando(pedido.enviadoEm)}
        </span>
      </Td>
    </>
  );
}

function Linha({
  pedido,
  avaliacao,
  marcado,
  aoAlternar,
  aoAbrir,
}: {
  readonly pedido: PedidoDeVenda;
  readonly avaliacao: AvaliacaoDoPedido | undefined;
  readonly marcado: boolean;
  readonly aoAlternar: () => void;
  readonly aoAbrir: () => void;
}) {
  const aoTeclar = teclasDaLinha(aoAlternar, aoAbrir);
  return (
    <tr
      tabIndex={0}
      onDoubleClick={aoAbrir}
      onKeyDown={aoTeclar}
      aria-selected={marcado}
      title="Dois cliques abrem a análise do pedido · espaço marca para aprovar"
      className={`divide-hairline-light cursor-default divide-x outline-none transition-colors duration-150 ${
        marcado ? 'bg-brand-50' : 'hover:bg-surface-soft focus-visible:bg-surface-soft'
      }`}
    >
      <td className="px-3 py-2 text-center align-top">
        <Caixa
          estado={marcado ? 'marcada' : 'desmarcada'}
          rotulo={`Selecionar o pedido ${pedido.numero}`}
          aoAlternar={aoAlternar}
        />
      </td>
      <Dados pedido={pedido} avaliacao={avaliacao} />
    </tr>
  );
}

/** O centro da ficha: todo pedido deste cliente que espera analise, com o
 *  motivo, o valor comercial e a exposicao lado a lado. O que veio da fila ja
 *  chega marcado; dois cliques abrem a analise do pedido. */
export function PedidosEmAnalise({
  pedidos,
  avaliacoes,
  lote,
  selecionados,
  aoAlternar,
  aoSelecionarTodos,
  aoAbrir,
  aoLiberar,
  liberando,
  permissoes,
}: {
  readonly pedidos: readonly PedidoDeVenda[];
  readonly avaliacoes: readonly AvaliacaoDoPedido[];
  readonly lote: AvaliacaoDoLote;
  readonly selecionados: ReadonlySet<string>;
  readonly aoAlternar: (id: string) => void;
  readonly aoSelecionarTodos: (marcar: boolean) => void;
  readonly aoAbrir: (pedido: PedidoDeVenda) => void;
  readonly aoLiberar: () => void;
  readonly liberando: boolean;
  readonly permissoes: PermissoesDaDecisao;
}) {
  const marcados = pedidos.filter((pedido) => selecionados.has(pedido.id)).length;
  const todos = marcados === pedidos.length && pedidos.length > 0;
  const porPedido = new Map(avaliacoes.map((avaliacao) => [avaliacao.pedidoId, avaliacao]));

  return (
    <Cartao
      titulo="Pedidos em análise"
      acao={
        pedidos.length > 1 ? (
          <span className="text-body-sm text-charcoal flex items-center gap-2">
            <Caixa
              estado={todos ? 'marcada' : marcados > 0 ? 'parcial' : 'desmarcada'}
              rotulo="Selecionar todos os pedidos em análise"
              aoAlternar={() => aoSelecionarTodos(!todos)}
            />
            Selecionar todos
          </span>
        ) : (
          <span className="text-body-sm text-stone">{pedidos.length} pedido(s)</span>
        )
      }
      rodape={
        pedidos.length > 0 ? (
          <LiberacaoDoLote
            lote={lote}
            total={pedidos.length}
            liberando={liberando}
            permissoes={permissoes}
            aoLiberar={aoLiberar}
          />
        ) : undefined
      }
    >
      {pedidos.length === 0 ? (
        <Vazio texto="Este cliente não tem pedidos esperando análise." />
      ) : (
        <Tabela colunas={COLUNAS} larguraMinima={900}>
          {pedidos.map((pedido) => (
            <Linha
              key={pedido.id}
              pedido={pedido}
              avaliacao={porPedido.get(pedido.id)}
              marcado={selecionados.has(pedido.id)}
              aoAlternar={() => aoAlternar(pedido.id)}
              aoAbrir={() => aoAbrir(pedido)}
            />
          ))}
        </Tabela>
      )}
    </Cartao>
  );
}
