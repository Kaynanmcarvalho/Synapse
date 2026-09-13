import type { PedidoDeVenda } from '@synapse/types';
import { CheckCheck } from 'lucide-react';
import { useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { formatarMoeda, ROTULO_DO_TIPO } from './analise';
import { pagamentoDoPedido } from './fila/filtros';

function ListaDaLiberacao({ pedidos }: { readonly pedidos: readonly PedidoDeVenda[] }) {
  const total = pedidos.reduce((soma, pedido) => soma + pedido.totalCentavos, 0);
  return (
    <>
      <ul className="border-hairline-light divide-hairline-light mt-5 divide-y rounded-xl border">
        {pedidos.map((pedido) => (
          <li key={pedido.id} className="flex items-center gap-3 px-4 py-2.5">
            <span className="min-w-0 flex-1">
              <span className="text-body-sm text-ink block font-semibold">
                Pedido {pedido.numero} · {ROTULO_DO_TIPO[pedido.tipo]}
              </span>
              <span className="text-caption text-stone block truncate">
                {pagamentoDoPedido(pedido)}
              </span>
            </span>
            <span className="text-body-sm text-ink font-semibold tabular-nums">
              {formatarMoeda(pedido.totalCentavos)}
            </span>
          </li>
        ))}
      </ul>
      <p className="text-body-sm text-charcoal mt-3 flex justify-between px-1">
        <span>Total liberado</span>
        <strong className="text-ink tabular-nums">{formatarMoeda(total)}</strong>
      </p>
    </>
  );
}

/** Liberar manda o pedido para o faturamento: nao e um clique para dar sem ver
 *  o que vai junto. A confirmacao lista cada pedido e o total. */
export function ConfirmarLiberacao({
  cliente,
  pedidos,
  aoConfirmar,
  aoCancelar,
}: {
  readonly cliente: string;
  readonly pedidos: readonly PedidoDeVenda[];
  readonly aoConfirmar: () => void;
  readonly aoCancelar: () => void;
}) {
  const confirmar = useRef<HTMLButtonElement>(null);

  // O foco vai para a acao principal: Enter confirma, Esc cancela.
  useEffect(() => confirmar.current?.focus(), []);

  useEffect(() => {
    const aoTeclar = (evento: KeyboardEvent) => {
      if (evento.key === 'Escape') aoCancelar();
    };
    document.addEventListener('keydown', aoTeclar);
    return () => document.removeEventListener('keydown', aoTeclar);
  }, [aoCancelar]);

  return createPortal(
    <div className="bg-canvas-dark/30 animate-revelar fixed inset-0 z-[90] flex items-center justify-center p-4 backdrop-blur-[2px] motion-reduce:animate-none">
      <div
        role="alertdialog"
        aria-modal="true"
        aria-label="Confirmar liberação"
        className="bg-canvas-light shadow-janela animate-surgir w-full max-w-md rounded-2xl p-6 motion-reduce:animate-none"
      >
        <span className="bg-surface-soft text-ink flex h-11 w-11 items-center justify-center rounded-full">
          <CheckCheck size={20} aria-hidden="true" />
        </span>
        <h2 className="font-display text-heading-sm text-ink mt-4">
          Liberar {pedidos.length > 1 ? `${pedidos.length} pedidos` : 'o pedido'} de {cliente}?
        </h2>
        <p className="text-body-sm text-mute mt-1">
          Eles saem da análise de crédito e seguem para o faturamento. A liberação fica registrada
          no histórico de cada pedido, com o seu nome e o horário.
        </p>

        <ListaDaLiberacao pedidos={pedidos} />

        <div className="mt-6 flex justify-end gap-2">
          <button
            type="button"
            onClick={aoCancelar}
            className="bg-surface-soft text-button-sm text-ink h-10 rounded-full px-5 transition hover:bg-[#ececee]"
          >
            Cancelar
          </button>
          <button
            type="button"
            ref={confirmar}
            onClick={aoConfirmar}
            className="bg-canvas-dark text-button-sm hover:bg-charcoal h-10 rounded-full px-5 text-white transition"
          >
            Liberar e enviar ao faturamento
          </button>
        </div>
      </div>
    </div>,
    document.body,
  );
}
