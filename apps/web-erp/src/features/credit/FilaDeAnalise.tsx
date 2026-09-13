import type { PedidoDeVenda } from '@synapse/types';
import { Search } from 'lucide-react';
import { useMemo, useState } from 'react';
import {
  formatarDataHora,
  formatarMoeda,
  prazoDoPedido,
  ROTULO_DA_ORIGEM,
  ROTULO_DO_TIPO,
} from './analise';

function LinhaDaFila({
  pedido,
  selecionado,
  onEscolher,
}: {
  readonly pedido: PedidoDeVenda;
  readonly selecionado: boolean;
  readonly onEscolher: () => void;
}) {
  return (
    <li>
      <button
        type="button"
        onClick={onEscolher}
        aria-current={selecionado}
        className={`flex w-full flex-wrap items-center gap-x-4 gap-y-1 rounded-xl border p-4 text-left transition ${
          selecionado
            ? 'border-hairline-strong bg-surface-soft'
            : 'border-hairline-light hover:bg-surface-soft'
        }`}
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

/** Conteudo da janela da fila: tudo que os vendedores mandaram e ainda espera
 *  decisao. A janela fica aberta enquanto o analista trabalha — voltar para a
 *  lista e so clicar nela de novo. */
export function ConteudoDaFila({
  pedidos,
  carregando,
  erro,
  clienteSelecionado,
  onEscolher,
}: {
  readonly pedidos: readonly PedidoDeVenda[];
  readonly carregando: boolean;
  readonly erro: string | null;
  readonly clienteSelecionado: string | null;
  readonly onEscolher: (pedido: PedidoDeVenda) => void;
}) {
  const [busca, setBusca] = useState('');

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
    <div className="flex h-full min-h-0 flex-col">
      <div className="bg-canvas-light sticky top-0 z-10 px-5 pb-3 pt-4">
        <label className="bg-surface-soft flex h-11 items-center gap-3 rounded-full px-4">
          <Search size={16} className="text-stone" aria-hidden="true" />
          <input
            value={busca}
            onChange={(evento) => setBusca(evento.target.value)}
            placeholder="Buscar por cliente, número ou vendedor"
            className="text-body-sm text-ink placeholder:text-stone h-full flex-1 bg-transparent outline-none"
          />
        </label>
        <p className="text-caption text-stone mt-2">
          {carregando
            ? 'Carregando a fila…'
            : `${filtrados.length} de ${pedidos.length} pedido(s) aguardando análise`}
        </p>
      </div>

      <div className="min-h-0 flex-1 px-5 pb-4">
        {erro && <p className="text-body-sm text-accent-danger py-6 text-center">{erro}</p>}
        {!erro && !carregando && filtrados.length === 0 && (
          <p className="text-body-sm text-stone py-10 text-center">
            Nenhum pedido esperando análise.
          </p>
        )}
        <ul className="space-y-2">
          {filtrados.map((pedido) => (
            <LinhaDaFila
              key={pedido.id}
              pedido={pedido}
              selecionado={pedido.customerId === clienteSelecionado}
              onEscolher={() => onEscolher(pedido)}
            />
          ))}
        </ul>
      </div>
    </div>
  );
}
