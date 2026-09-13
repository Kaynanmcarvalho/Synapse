import type { PedidoDeVenda } from '@synapse/types';
import { Search, X } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import {
  formatarDataHora,
  formatarMoeda,
  prazoDoPedido,
  ROTULO_DA_ORIGEM,
  ROTULO_DO_TIPO,
} from './analise';

function Cabecalho({
  resumo,
  podeFechar,
  onFechar,
  busca,
  onBuscar,
}: {
  readonly resumo: string;
  readonly podeFechar: boolean;
  readonly onFechar: () => void;
  readonly busca: string;
  readonly onBuscar: (valor: string) => void;
}) {
  return (
    <>
      <header className="border-hairline-light flex items-start justify-between gap-4 border-b px-6 py-5">
        <div>
          <h2 className="font-display text-heading-md text-ink">Pedidos aguardando análise</h2>
          <p className="text-body-sm text-mute mt-1">{resumo}</p>
        </div>
        {podeFechar && (
          <button
            type="button"
            onClick={onFechar}
            aria-label="Fechar lista de pedidos"
            className="text-charcoal hover:bg-surface-soft flex h-10 w-10 shrink-0 items-center justify-center rounded-full transition"
          >
            <X size={18} />
          </button>
        )}
      </header>

      <div className="px-6 pt-4">
        <label className="bg-surface-soft flex h-12 items-center gap-3 rounded-full px-4">
          <Search size={17} className="text-stone" aria-hidden="true" />
          <input
            value={busca}
            onChange={(evento) => onBuscar(evento.target.value)}
            placeholder="Buscar por cliente, número do pedido ou vendedor"
            className="text-body-sm text-ink placeholder:text-stone h-full flex-1 bg-transparent outline-none"
          />
        </label>
      </div>
    </>
  );
}

function LinhaDaFila({
  pedido,
  onEscolher,
}: {
  readonly pedido: PedidoDeVenda;
  readonly onEscolher: () => void;
}) {
  return (
    <li>
      <button
        type="button"
        onClick={onEscolher}
        className="border-hairline-light hover:bg-surface-soft flex w-full flex-wrap items-center gap-x-4 gap-y-1 rounded-xl border p-4 text-left transition"
      >
        <span className="min-w-0 flex-1 basis-56">
          <span className="text-body-md text-ink block truncate font-semibold">
            {pedido.clienteNome}
          </span>
          <span className="text-body-sm text-stone block truncate">
            Pedido {pedido.numero} · {ROTULO_DO_TIPO[pedido.tipo]} · {pedido.condicaoDePagamento} ·{' '}
            {ROTULO_DA_ORIGEM[pedido.origem]} · {pedido.vendedorNome}
          </span>
        </span>
        <span className="ml-auto text-right">
          <span className="text-body-md text-ink block font-semibold">
            {formatarMoeda(pedido.totalCentavos)}
          </span>
          <span className="text-caption text-stone block">
            {prazoDoPedido(pedido)} · {formatarDataHora(pedido.enviadoEm)}
          </span>
        </span>
      </button>
    </li>
  );
}

/** A fila que abre junto com a tela: tudo que os vendedores mandaram e ainda
 *  espera uma decisao. E o ponto de partida — so depois de escolher um pedido a
 *  ficha do cliente aparece atras. */
export function FilaDeAnalise({
  pedidos,
  carregando,
  erro,
  podeFechar,
  onEscolher,
  onFechar,
}: {
  readonly pedidos: readonly PedidoDeVenda[];
  readonly carregando: boolean;
  readonly erro: string | null;
  readonly podeFechar: boolean;
  readonly onEscolher: (pedido: PedidoDeVenda) => void;
  readonly onFechar: () => void;
}) {
  const [busca, setBusca] = useState('');

  useEffect(() => {
    if (!podeFechar) return;
    const aoTeclar = (evento: KeyboardEvent) => {
      if (evento.key === 'Escape') onFechar();
    };
    document.addEventListener('keydown', aoTeclar);
    return () => document.removeEventListener('keydown', aoTeclar);
  }, [podeFechar, onFechar]);

  const filtrados = useMemo(() => {
    const termo = busca.trim().toLowerCase();
    if (!termo) return pedidos;
    return pedidos.filter((pedido) =>
      [pedido.clienteNome, String(pedido.numero), pedido.vendedorNome, pedido.clienteDocumento]
        .filter(Boolean)
        .some((campo) => String(campo).toLowerCase().includes(termo)),
    );
  }, [pedidos, busca]);

  return (
    <div className="bg-canvas-dark/40 fixed inset-0 z-50 flex items-start justify-center overflow-y-auto p-4 backdrop-blur-sm sm:p-8">
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Pedidos aguardando análise"
        className="border-hairline-light bg-canvas-light w-full max-w-4xl rounded-2xl border shadow-xl"
      >
        <Cabecalho
          resumo={
            carregando
              ? 'Carregando a fila…'
              : `${pedidos.length} pedido(s) na fila, do mais recente para o mais antigo.`
          }
          podeFechar={podeFechar}
          onFechar={onFechar}
          busca={busca}
          onBuscar={setBusca}
        />

        <div className="max-h-[60vh] overflow-y-auto px-6 py-4">
          {erro && <p className="text-body-sm text-accent-danger py-6 text-center">{erro}</p>}
          {!erro && !carregando && filtrados.length === 0 && (
            <p className="text-body-sm text-stone py-10 text-center">
              Nenhum pedido esperando análise.
            </p>
          )}
          <ul className="space-y-2">
            {filtrados.map((pedido) => (
              <LinhaDaFila key={pedido.id} pedido={pedido} onEscolher={() => onEscolher(pedido)} />
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}
