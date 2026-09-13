import type { PedidoDeVenda } from '@synapse/types';
import { Check, CheckCheck, Minus } from 'lucide-react';
import type { KeyboardEvent as EventoDeTecla } from 'react';
import { Cartao, Vazio } from './Cartao';
import { Celula, Tabela, type ColunaDaTabela } from './Tabela';
import { formatarMoeda, prazoDoPedido, ROTULO_DA_ORIGEM, ROTULO_DO_TIPO } from './analise';
import { pagamentoDoPedido } from './fila/filtros';

const COLUNAS: readonly ColunaDaTabela[] = [
  { rotulo: '', alinhamento: 'centro', largura: '44px' },
  { rotulo: 'Pedido' },
  { rotulo: 'Tipo' },
  { rotulo: 'Pagamento' },
  { rotulo: 'Prazo médio', alinhamento: 'direita' },
  { rotulo: 'Origem' },
  { rotulo: 'Representante' },
  { rotulo: 'Total', alinhamento: 'direita' },
];

const coluna = (indice: number): ColunaDaTabela => COLUNAS[indice] ?? { rotulo: '' };

function Caixa({
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

function Linha({
  pedido,
  marcado,
  aoAlternar,
  aoAbrir,
}: {
  readonly pedido: PedidoDeVenda;
  readonly marcado: boolean;
  readonly aoAlternar: () => void;
  readonly aoAbrir: () => void;
}) {
  const aoTeclar = (evento: EventoDeTecla<HTMLTableRowElement>) => {
    if (evento.key === ' ') {
      evento.preventDefault();
      aoAlternar();
    } else if (evento.key === 'Enter') {
      evento.preventDefault();
      aoAbrir();
    }
  };

  return (
    <tr
      tabIndex={0}
      onDoubleClick={aoAbrir}
      onKeyDown={aoTeclar}
      aria-selected={marcado}
      title="Dois cliques abrem o pedido · espaço marca para liberar"
      className={`divide-hairline-light cursor-default divide-x outline-none transition-colors duration-150 ${
        marcado ? 'bg-brand-50' : 'hover:bg-surface-soft focus-visible:bg-surface-soft'
      }`}
    >
      <Celula coluna={coluna(0)}>
        <Caixa
          estado={marcado ? 'marcada' : 'desmarcada'}
          rotulo={`Selecionar o pedido ${pedido.numero} para liberar`}
          aoAlternar={aoAlternar}
        />
      </Celula>
      <Celula coluna={coluna(1)} forte>
        {pedido.numero}
      </Celula>
      <Celula coluna={coluna(2)}>{ROTULO_DO_TIPO[pedido.tipo]}</Celula>
      <Celula coluna={coluna(3)}>{pagamentoDoPedido(pedido)}</Celula>
      <Celula coluna={coluna(4)}>{prazoDoPedido(pedido)}</Celula>
      <Celula coluna={coluna(5)}>{ROTULO_DA_ORIGEM[pedido.origem]}</Celula>
      <Celula coluna={coluna(6)}>{pedido.vendedorNome}</Celula>
      <Celula coluna={coluna(7)} forte>
        {formatarMoeda(pedido.totalCentavos)}
      </Celula>
    </tr>
  );
}

/** Rodape do quadro: quanto esta marcado e o botao que manda para o faturamento. */
function Liberacao({
  quantos,
  total,
  valorCentavos,
  liberando,
  aoLiberar,
}: {
  readonly quantos: number;
  readonly total: number;
  readonly valorCentavos: number;
  readonly liberando: boolean;
  readonly aoLiberar: () => void;
}) {
  return (
    <div className="flex w-full flex-wrap items-center gap-x-6 gap-y-2">
      <span className="flex flex-col">
        <span className="text-caption text-stone">Selecionados para liberar</span>
        <strong className="text-body-md text-ink font-semibold tabular-nums">
          {quantos} de {total} · {formatarMoeda(valorCentavos)}
        </strong>
      </span>
      <button
        type="button"
        onClick={aoLiberar}
        disabled={quantos === 0 || liberando}
        className="bg-canvas-dark text-button-sm hover:bg-charcoal shadow-cartao ml-auto inline-flex h-10 items-center gap-2 rounded-full px-5 text-white transition disabled:cursor-not-allowed disabled:opacity-40"
      >
        <CheckCheck size={16} aria-hidden="true" />
        {liberando ? 'Liberando…' : quantos > 1 ? `Liberar ${quantos} pedidos` : 'Liberar pedido'}
      </button>
    </div>
  );
}

/** O centro da tela: todo pedido deste cliente que espera analise. Cada um tem
 *  sua caixa — o que veio da fila ja chega marcado, e os outros o analista marca
 *  se quiser liberar tudo de uma vez. Dois cliques abrem o pedido inteiro. */
export function PedidosEmAnalise({
  pedidos,
  selecionados,
  aoAlternar,
  aoSelecionarTodos,
  aoAbrir,
  aoLiberar,
  liberando,
}: {
  readonly pedidos: readonly PedidoDeVenda[];
  readonly selecionados: ReadonlySet<string>;
  readonly aoAlternar: (id: string) => void;
  readonly aoSelecionarTodos: (marcar: boolean) => void;
  readonly aoAbrir: (pedido: PedidoDeVenda) => void;
  readonly aoLiberar: () => void;
  readonly liberando: boolean;
}) {
  const marcados = pedidos.filter((pedido) => selecionados.has(pedido.id));
  const todos = marcados.length === pedidos.length && pedidos.length > 0;
  const estadoGeral = todos ? 'marcada' : marcados.length > 0 ? 'parcial' : 'desmarcada';

  return (
    <Cartao
      titulo="Pedidos em análise"
      acao={
        pedidos.length > 1 ? (
          <span className="text-body-sm text-charcoal flex items-center gap-2">
            <Caixa
              estado={estadoGeral}
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
          <Liberacao
            quantos={marcados.length}
            total={pedidos.length}
            valorCentavos={marcados.reduce((soma, pedido) => soma + pedido.totalCentavos, 0)}
            liberando={liberando}
            aoLiberar={aoLiberar}
          />
        ) : undefined
      }
    >
      {pedidos.length === 0 ? (
        <Vazio texto="Este cliente não tem pedidos esperando análise." />
      ) : (
        <Tabela colunas={COLUNAS} larguraMinima={720}>
          {pedidos.map((pedido) => (
            <Linha
              key={pedido.id}
              pedido={pedido}
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
