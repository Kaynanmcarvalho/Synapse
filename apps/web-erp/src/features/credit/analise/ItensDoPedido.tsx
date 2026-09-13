import type { PedidoDeVenda } from '@synapse/types';
import { ChevronDown } from 'lucide-react';
import { useState } from 'react';
import { Celula, LinhaDaTabela, Tabela, type ColunaDaTabela } from '../Tabela';
import { formatarMoeda, formatarQuantidade } from '../analise';

const COLUNAS: readonly ColunaDaTabela[] = [
  { rotulo: 'Código', largura: '96px' },
  { rotulo: 'Produto' },
  { rotulo: 'Qtd.', alinhamento: 'direita', largura: '72px' },
  { rotulo: 'Unitário', alinhamento: 'direita' },
  { rotulo: 'Desconto', alinhamento: 'direita' },
  { rotulo: 'Total', alinhamento: 'direita' },
];

const coluna = (indice: number): ColunaDaTabela => COLUNAS[indice] ?? { rotulo: '' };

/** Quantos itens aparecem antes do "Ver todos": o bastante para ler o pedido
 *  comum de uma vez, sem que o pedido de 80 linhas empurre o resto da tela. */
export const ITENS_VISIVEIS = 6;

const bruto = (pedido: PedidoDeVenda): number =>
  pedido.itens.reduce(
    (soma, item) => soma + Math.round((item.quantidade * item.precoUnitarioCentavos) / 1000),
    0,
  );

function Linha({
  rotulo,
  valor,
  forte = false,
}: {
  rotulo: string;
  valor: string;
  forte?: boolean;
}) {
  return (
    <div
      className={`flex justify-between gap-4 ${forte ? 'border-hairline-light border-t pt-1.5' : ''}`}
    >
      <dt className={forte ? 'text-body-sm text-ink font-semibold' : 'text-caption text-stone'}>
        {rotulo}
      </dt>
      <dd
        className={`tabular-nums ${forte ? 'text-body-md text-ink font-semibold' : 'text-body-sm text-charcoal'}`}
      >
        {valor}
      </dd>
    </div>
  );
}

/** Rodape dos itens: subtotal, descontos, frete e acrescimo quando houver, e o
 *  total. Entrada aparece a parte: e dinheiro que ja entrou, nao desconto. */
function Totais({ pedido }: { readonly pedido: PedidoDeVenda }) {
  return (
    <dl className="ml-auto grid w-full max-w-xs gap-1 pt-3">
      <Linha rotulo="Subtotal" valor={formatarMoeda(bruto(pedido))} />
      <Linha rotulo="Descontos" valor={`− ${formatarMoeda(pedido.descontoCentavos)}`} />
      {(pedido.freteCentavos ?? 0) > 0 && (
        <Linha rotulo="Frete" valor={formatarMoeda(pedido.freteCentavos ?? 0)} />
      )}
      {(pedido.acrescimoCentavos ?? 0) > 0 && (
        <Linha rotulo="Acréscimos" valor={formatarMoeda(pedido.acrescimoCentavos ?? 0)} />
      )}
      <Linha rotulo="Total" valor={formatarMoeda(pedido.totalCentavos)} forte />
      {(pedido.entradaCentavos ?? 0) > 0 && (
        <Linha rotulo="Entrada já paga" valor={formatarMoeda(pedido.entradaCentavos ?? 0)} />
      )}
    </dl>
  );
}

export function ItensDoPedido({ pedido }: { readonly pedido: PedidoDeVenda }) {
  const [todos, setTodos] = useState(false);
  const visiveis = todos ? pedido.itens : pedido.itens.slice(0, ITENS_VISIVEIS);
  const escondidos = pedido.itens.length - visiveis.length;

  if (pedido.itens.length === 0)
    return <p className="text-body-sm text-stone py-3">Este pedido não tem itens registrados.</p>;

  return (
    <div>
      <Tabela colunas={COLUNAS} larguraMinima={620}>
        {visiveis.map((item, indice) => (
          <LinhaDaTabela key={`${item.productId}-${indice}`}>
            <Celula coluna={coluna(0)}>
              <span className="text-stone block max-w-[88px] truncate" title={item.productId}>
                {item.productId}
              </span>
            </Celula>
            <td className="text-body-sm text-ink px-3 py-2">{item.descricao}</td>
            <Celula coluna={coluna(2)}>{formatarQuantidade(item.quantidade)}</Celula>
            <Celula coluna={coluna(3)}>{formatarMoeda(item.precoUnitarioCentavos)}</Celula>
            <Celula coluna={coluna(4)}>
              {item.descontoCentavos > 0 ? formatarMoeda(item.descontoCentavos) : '—'}
            </Celula>
            <Celula coluna={coluna(5)} forte>
              {formatarMoeda(item.totalCentavos)}
            </Celula>
          </LinhaDaTabela>
        ))}
      </Tabela>
      {(escondidos > 0 || todos) && pedido.itens.length > ITENS_VISIVEIS && (
        <button
          type="button"
          onClick={() => setTodos((atual) => !atual)}
          className="text-button-sm text-accent-link mt-2 inline-flex items-center gap-1 hover:underline"
        >
          <ChevronDown
            size={15}
            aria-hidden="true"
            className={`transition ${todos ? 'rotate-180' : ''}`}
          />
          {todos ? 'Mostrar menos' : `Ver todos os ${pedido.itens.length} itens`}
        </button>
      )}
      <Totais pedido={pedido} />
    </div>
  );
}
