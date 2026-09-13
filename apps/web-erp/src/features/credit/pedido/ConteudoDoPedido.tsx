import type { CarteiraDoCliente, PedidoDeVenda } from '@synapse/types';
import { useState } from 'react';
import { AbaFinanceiro } from './AbaFinanceiro';
import { AbaHistorico } from './AbaHistorico';
import { AbaItens } from './AbaItens';
import { AbaObservacoes } from './AbaObservacoes';
import { AbaResumo } from './AbaResumo';

type Aba = 'resumo' | 'itens' | 'financeiro' | 'observacoes' | 'historico';

/** A janela do pedido, por abas: cada uma responde a uma pergunta — o que foi
 *  combinado, o que vai na carga, quanto e quando vai pagar, o que ja se falou
 *  sobre ele e por onde ele ja passou. */
export function ConteudoDoPedido({
  pedido,
  carteira,
  aoVerParcelas,
  aoAbrirCadastro,
  aoObservar,
}: {
  readonly pedido: PedidoDeVenda;
  readonly carteira: CarteiraDoCliente | null;
  readonly aoVerParcelas: () => void;
  readonly aoAbrirCadastro: () => void;
  readonly aoObservar: (texto: string) => Promise<void>;
}) {
  const [aba, setAba] = useState<Aba>('resumo');
  const abas: ReadonlyArray<{
    readonly id: Aba;
    readonly rotulo: string;
    readonly contagem?: number;
  }> = [
    { id: 'resumo', rotulo: 'Resumo' },
    { id: 'itens', rotulo: 'Itens', contagem: pedido.itens.length },
    { id: 'financeiro', rotulo: 'Financeiro' },
    { id: 'observacoes', rotulo: 'Observações', contagem: pedido.observacoes?.length ?? 0 },
    { id: 'historico', rotulo: 'Histórico', contagem: pedido.historico?.length ?? 0 },
  ];

  return (
    <div className="flex h-full min-h-0 flex-col">
      <div
        role="tablist"
        aria-label={`Pedido ${pedido.numero}`}
        className="border-hairline-light bg-canvas-light sticky top-0 z-10 flex gap-1 overflow-x-auto border-b px-4 py-2.5"
      >
        {abas.map((opcao) => {
          const ativa = aba === opcao.id;
          return (
            <button
              key={opcao.id}
              type="button"
              role="tab"
              aria-selected={ativa}
              onClick={() => setAba(opcao.id)}
              className={`text-button-sm inline-flex h-9 shrink-0 items-center gap-2 rounded-full px-4 transition duration-200 ${
                ativa
                  ? 'bg-canvas-dark shadow-cartao text-white'
                  : 'text-charcoal hover:bg-surface-soft hover:text-ink'
              }`}
            >
              {opcao.rotulo}
              {opcao.contagem !== undefined && opcao.contagem > 0 && (
                <span
                  className={`text-caption rounded-full px-1.5 tabular-nums ${
                    ativa ? 'bg-white/20 text-white' : 'bg-surface-soft text-stone'
                  }`}
                >
                  {opcao.contagem}
                </span>
              )}
            </button>
          );
        })}
      </div>

      <div
        key={aba}
        role="tabpanel"
        className="animate-revelar min-h-0 flex-1 overflow-y-auto bg-[#fafafa] p-5 motion-reduce:animate-none"
      >
        {aba === 'resumo' && (
          <AbaResumo
            pedido={pedido}
            aoVerParcelas={aoVerParcelas}
            aoAbrirCadastro={aoAbrirCadastro}
          />
        )}
        {aba === 'itens' && <AbaItens pedido={pedido} />}
        {aba === 'financeiro' && (
          <AbaFinanceiro pedido={pedido} carteira={carteira} aoVerParcelas={aoVerParcelas} />
        )}
        {aba === 'observacoes' && <AbaObservacoes pedido={pedido} aoObservar={aoObservar} />}
        {aba === 'historico' && <AbaHistorico historico={pedido.historico ?? []} />}
      </div>
    </div>
  );
}
