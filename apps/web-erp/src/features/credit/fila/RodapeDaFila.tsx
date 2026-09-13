import type { PedidoNaFila } from '@synapse/types';
import { formatarMoeda, prazoDoPedido, ROTULO_DA_ORIGEM } from '../analise';
import { totaisDaFila } from './colunas';
import { pagamentoDoPedido } from './filtros';

function Dado({
  rotulo,
  valor,
  tom = 'neutro',
}: {
  readonly rotulo: string;
  readonly valor: string;
  readonly tom?: 'neutro' | 'alerta' | 'forte';
}) {
  const cor =
    tom === 'alerta' ? 'text-accent-danger' : tom === 'forte' ? 'text-ink' : 'text-charcoal';
  return (
    <span className="flex min-w-0 flex-col">
      <span className="text-caption text-stone font-semibold uppercase tracking-[0.06em]">
        {rotulo}
      </span>
      <span className={`text-body-sm truncate font-semibold tabular-nums ${cor}`}>{valor}</span>
    </span>
  );
}

/** O pe da janela, como na tela antiga: a forma de pagamento com o prazo real e
 *  a observacao do pedido que estiver selecionado, mais os totais do que o
 *  filtro deixou na tela. */
export function RodapeDaFila({
  linhas,
  selecionada,
}: {
  readonly linhas: readonly PedidoNaFila[];
  readonly selecionada: PedidoNaFila | null;
}) {
  const totais = totaisDaFila(linhas);
  const pedido = selecionada?.pedido ?? null;

  return (
    <div className="border-hairline-light bg-canvas-light shrink-0 border-t">
      <div className="grid gap-4 px-5 py-3 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
        <section
          aria-label="Forma de pagamento do pedido selecionado"
          className="border-hairline-light rounded-xl border px-4 py-2.5"
        >
          {pedido ? (
            <div className="flex flex-wrap items-center gap-x-8 gap-y-2">
              <Dado rotulo="Pedido" valor={`Nº ${pedido.numero}`} tom="forte" />
              <Dado rotulo="Forma de pagamento" valor={pagamentoDoPedido(pedido)} tom="forte" />
              <Dado rotulo="Prazo médio" valor={prazoDoPedido(pedido)} />
              <Dado rotulo="Origem" valor={ROTULO_DA_ORIGEM[pedido.origem]} />
              <Dado
                rotulo="Valor do pedido"
                valor={formatarMoeda(pedido.totalCentavos)}
                tom="forte"
              />
            </div>
          ) : (
            <p className="text-body-sm text-stone py-1">
              Selecione um pedido para ver a forma de pagamento e o prazo.
            </p>
          )}
        </section>

        <section
          aria-label="Observação do pedido selecionado"
          className="border-hairline-light min-h-[58px] rounded-xl border px-4 py-2.5"
        >
          <span className="text-caption text-stone font-semibold uppercase tracking-[0.06em]">
            Observação do pedido
          </span>
          <p className="text-body-sm text-charcoal mt-0.5 line-clamp-2">
            {pedido?.observacao?.trim() ? pedido.observacao : '—'}
          </p>
        </section>
      </div>

      <div className="border-hairline-light bg-surface-soft flex flex-wrap items-center gap-x-8 gap-y-1 border-t px-5 py-2.5">
        <span className="text-caption text-stone">
          <strong className="text-ink text-body-sm tabular-nums">{totais.pedidos}</strong> pedido(s)
          · {totais.clientes} cliente(s)
        </span>
        <span className="text-caption text-stone">
          Total{' '}
          <strong className="text-ink text-body-sm tabular-nums">
            {formatarMoeda(totais.valorCentavos)}
          </strong>
        </span>
        <span className="text-caption text-stone">
          Vencido dos clientes{' '}
          <strong
            className={`text-body-sm tabular-nums ${
              totais.vencidoCentavos > 0 ? 'text-accent-danger' : 'text-ink'
            }`}
          >
            {formatarMoeda(totais.vencidoCentavos)}
          </strong>
        </span>
        <span className="text-caption text-faint ml-auto hidden xl:block">
          Um clique seleciona · dois cliques abrem · setas navegam · dois cliques na divisão da
          coluna voltam a largura
        </span>
      </div>
    </div>
  );
}
