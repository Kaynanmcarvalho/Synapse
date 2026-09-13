import type { NotaDoCliente, PedidoDeVenda } from '@synapse/types';
import { Cartao, Vazio } from './Cartao';
import { formatarData, formatarMoeda, ROTULO_DA_SITUACAO, ROTULO_DO_TIPO } from './analise';

export type AbaDoHistorico = 'pedidos' | 'notas';

/** Canto superior direito: o historico do cliente. Pedidos e notas dividem o
 *  mesmo espaco — sao a mesma pergunta ("o que esse cliente vem comprando?")
 *  vista de dois lados, e a chave troca sem tirar nada do lugar. */
function Chave({
  aba,
  onTrocar,
}: {
  readonly aba: AbaDoHistorico;
  readonly onTrocar: (aba: AbaDoHistorico) => void;
}) {
  const opcoes: ReadonlyArray<{ readonly id: AbaDoHistorico; readonly rotulo: string }> = [
    { id: 'pedidos', rotulo: 'Últimos pedidos' },
    { id: 'notas', rotulo: 'Últimas NFs' },
  ];
  return (
    <span
      role="tablist"
      aria-label="Histórico do cliente"
      className="bg-surface-soft flex rounded-full p-1"
    >
      {opcoes.map((opcao) => (
        <button
          key={opcao.id}
          type="button"
          role="tab"
          aria-selected={aba === opcao.id}
          onClick={() => onTrocar(opcao.id)}
          className={`text-button-sm rounded-full px-3.5 py-1.5 transition ${
            aba === opcao.id ? 'bg-canvas-light text-ink' : 'text-charcoal hover:text-ink'
          }`}
        >
          {opcao.rotulo}
        </button>
      ))}
    </span>
  );
}

export function HistoricoDoCliente({
  aba,
  onTrocarAba,
  pedidos,
  notas,
}: {
  readonly aba: AbaDoHistorico;
  readonly onTrocarAba: (aba: AbaDoHistorico) => void;
  readonly pedidos: readonly PedidoDeVenda[];
  readonly notas: readonly NotaDoCliente[];
}) {
  return (
    <Cartao
      titulo={aba === 'pedidos' ? 'Últimos pedidos' : 'Últimas notas fiscais'}
      acao={<Chave aba={aba} onTrocar={onTrocarAba} />}
    >
      {aba === 'pedidos' &&
        (pedidos.length === 0 ? (
          <Vazio texto="Nenhum pedido registrado para este cliente." />
        ) : (
          <ul className="divide-hairline-light divide-y" role="tabpanel">
            {pedidos.map((pedido) => (
              <li key={pedido.id} className="flex items-center gap-3 py-2.5">
                <span className="min-w-0 flex-1">
                  <span className="text-body-sm text-ink block font-semibold">
                    Pedido {pedido.numero} · {ROTULO_DO_TIPO[pedido.tipo]}
                  </span>
                  <span className="text-caption text-stone block">
                    {formatarData(pedido.enviadoEm)} · {ROTULO_DA_SITUACAO[pedido.situacao]}
                  </span>
                </span>
                <span className="text-body-sm text-ink font-semibold">
                  {formatarMoeda(pedido.totalCentavos)}
                </span>
              </li>
            ))}
          </ul>
        ))}

      {aba === 'notas' &&
        (notas.length === 0 ? (
          <Vazio texto="Nenhuma nota emitida para este cliente." />
        ) : (
          <ul className="divide-hairline-light divide-y" role="tabpanel">
            {notas.map((nota) => (
              <li key={`${nota.serie}-${nota.numero}`} className="flex items-center gap-3 py-2.5">
                <span className="min-w-0 flex-1">
                  <span className="text-body-sm text-ink block font-semibold">
                    NF {nota.numero} · série {nota.serie}
                  </span>
                  <span className="text-caption text-stone block">
                    {formatarData(nota.emitidaEm)}
                  </span>
                </span>
                <span className="text-body-sm text-ink font-semibold">
                  {formatarMoeda(nota.totalCentavos)}
                </span>
              </li>
            ))}
          </ul>
        ))}
    </Cartao>
  );
}
