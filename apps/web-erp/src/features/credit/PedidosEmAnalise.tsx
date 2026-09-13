import type { PedidoDeVenda } from '@synapse/types';
import { ChevronDown } from 'lucide-react';
import { Cartao, Total, Vazio } from './Cartao';
import {
  formatarDataHora,
  formatarMoeda,
  formatarQuantidade,
  prazoDoPedido,
  ROTULO_DA_ORIGEM,
  ROTULO_DO_TIPO,
} from './analise';

/** O centro da tela: todo pedido deste cliente que espera analise, seja venda,
 *  bonificacao, troca ou devolucao. Prazo e valor ficam visiveis na linha — a
 *  decisao comeca antes de abrir o pedido. */
function Linha({
  pedido,
  aberto,
  onAlternar,
}: {
  readonly pedido: PedidoDeVenda;
  readonly aberto: boolean;
  readonly onAlternar: () => void;
}) {
  return (
    <li className="border-hairline-light rounded-xl border">
      <button
        type="button"
        onClick={onAlternar}
        aria-expanded={aberto}
        className="hover:bg-surface-soft flex w-full flex-wrap items-center gap-x-4 gap-y-2 rounded-xl p-4 text-left transition"
      >
        <span className="border-hairline-light text-caption text-charcoal rounded-full border px-2.5 py-0.5">
          {ROTULO_DO_TIPO[pedido.tipo]}
        </span>
        <span className="min-w-0 flex-1 basis-48">
          <span className="text-body-md text-ink block font-semibold">Pedido {pedido.numero}</span>
          <span className="text-body-sm text-stone block truncate">
            {pedido.condicaoDePagamento} · {ROTULO_DA_ORIGEM[pedido.origem]} · {pedido.vendedorNome}
          </span>
        </span>
        {/* Em tela estreita este bloco desce para a linha de baixo, inteiro. */}
        <span className="ml-auto flex items-center gap-4">
          <span className="text-right">
            <span className="text-caption text-stone block">Prazo</span>
            <span className="text-body-sm text-ink block font-semibold">
              {prazoDoPedido(pedido)}
            </span>
          </span>
          <span className="min-w-[112px] text-right">
            <span className="text-caption text-stone block">Total</span>
            <span className="text-body-md text-ink block font-semibold">
              {formatarMoeda(pedido.totalCentavos)}
            </span>
          </span>
          <ChevronDown
            size={18}
            aria-hidden="true"
            className={`text-stone transition ${aberto ? 'rotate-180' : ''}`}
          />
        </span>
      </button>

      {aberto && <Detalhe pedido={pedido} />}
    </li>
  );
}

function Detalhe({ pedido }: { readonly pedido: PedidoDeVenda }) {
  return (
    <div className="border-hairline-light border-t px-4 py-4">
      <dl className="text-body-sm grid grid-cols-2 gap-x-6 gap-y-2 sm:grid-cols-4">
        <div>
          <dt className="text-caption text-stone">Forma de pagamento</dt>
          <dd className="text-ink">{pedido.formaDePagamento}</dd>
        </div>
        <div>
          <dt className="text-caption text-stone">Vendedor</dt>
          <dd className="text-ink">{pedido.vendedorNome}</dd>
        </div>
        <div>
          <dt className="text-caption text-stone">Origem</dt>
          <dd className="text-ink">{ROTULO_DA_ORIGEM[pedido.origem]}</dd>
        </div>
        <div>
          <dt className="text-caption text-stone">Enviado em</dt>
          <dd className="text-ink">{formatarDataHora(pedido.enviadoEm)}</dd>
        </div>
      </dl>

      {pedido.observacao && (
        <p className="text-body-sm text-mute bg-surface-soft mt-3 rounded-xl px-4 py-3">
          {pedido.observacao}
        </p>
      )}

      <div className="mt-4 overflow-x-auto">
        <table className="w-full min-w-[520px] text-left">
          <thead>
            <tr className="text-caption text-stone">
              <th className="py-2 font-medium">Item</th>
              <th className="py-2 text-right font-medium">Qtd.</th>
              <th className="py-2 text-right font-medium">Unitário</th>
              <th className="py-2 text-right font-medium">Total</th>
            </tr>
          </thead>
          <tbody className="divide-hairline-light text-body-sm divide-y">
            {pedido.itens.map((item) => (
              <tr key={`${pedido.id}-${item.productId}`}>
                <td className="text-ink py-2 pr-4">{item.descricao}</td>
                <td className="text-charcoal py-2 text-right">
                  {formatarQuantidade(item.quantidade)}
                </td>
                <td className="text-charcoal py-2 text-right">
                  {formatarMoeda(item.precoUnitarioCentavos)}
                </td>
                <td className="text-ink py-2 text-right font-semibold">
                  {formatarMoeda(item.totalCentavos)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export function PedidosEmAnalise({
  pedidos,
  totalCentavos,
  abertos,
  onAlternar,
}: {
  readonly pedidos: readonly PedidoDeVenda[];
  readonly totalCentavos: number;
  readonly abertos: ReadonlySet<string>;
  readonly onAlternar: (id: string) => void;
}) {
  return (
    <Cartao
      titulo="Pedidos em análise"
      acao={<span className="text-body-sm text-stone">{pedidos.length} pedido(s)</span>}
      rodape={<Total rotulo="Total em análise" valor={formatarMoeda(totalCentavos)} />}
    >
      {pedidos.length === 0 ? (
        <Vazio texto="Este cliente não tem pedidos esperando análise." />
      ) : (
        <ul className="space-y-2">
          {pedidos.map((pedido) => (
            <Linha
              key={pedido.id}
              pedido={pedido}
              aberto={abertos.has(pedido.id)}
              onAlternar={() => onAlternar(pedido.id)}
            />
          ))}
        </ul>
      )}
    </Cartao>
  );
}
