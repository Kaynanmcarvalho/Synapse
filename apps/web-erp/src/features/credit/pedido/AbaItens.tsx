import type { PedidoDeVenda } from '@synapse/types';
import { Celula, LinhaDaTabela, Tabela, type ColunaDaTabela } from '../Tabela';
import { formatarMoeda, formatarQuantidade } from '../analise';

const COLUNAS: readonly ColunaDaTabela[] = [
  { rotulo: 'Item' },
  { rotulo: 'Qtd.', alinhamento: 'direita', largura: '80px' },
  { rotulo: 'Unitário', alinhamento: 'direita' },
  { rotulo: 'Desconto', alinhamento: 'direita' },
  { rotulo: 'Total', alinhamento: 'direita' },
];

const coluna = (indice: number): ColunaDaTabela => COLUNAS[indice] ?? { rotulo: '' };

export function AbaItens({ pedido }: { readonly pedido: PedidoDeVenda }) {
  const bruto = pedido.itens.reduce(
    (soma, item) => soma + Math.round((item.quantidade * item.precoUnitarioCentavos) / 1000),
    0,
  );

  return (
    <div className="grid gap-4">
      <Tabela colunas={COLUNAS} larguraMinima={560}>
        {pedido.itens.map((item, indice) => (
          <LinhaDaTabela key={`${item.productId}-${indice}`}>
            <td className="text-body-sm text-ink px-3 py-2">{item.descricao}</td>
            <Celula coluna={coluna(1)}>{formatarQuantidade(item.quantidade)}</Celula>
            <Celula coluna={coluna(2)}>{formatarMoeda(item.precoUnitarioCentavos)}</Celula>
            <Celula coluna={coluna(3)}>{formatarMoeda(item.descontoCentavos)}</Celula>
            <Celula coluna={coluna(4)} forte>
              {formatarMoeda(item.totalCentavos)}
            </Celula>
          </LinhaDaTabela>
        ))}
      </Tabela>

      <dl className="border-hairline-light bg-canvas-light shadow-cartao ml-auto grid w-full max-w-xs gap-2 rounded-2xl border p-4 text-right">
        <div className="flex justify-between">
          <dt className="text-body-sm text-stone">Bruto</dt>
          <dd className="text-body-sm text-charcoal tabular-nums">{formatarMoeda(bruto)}</dd>
        </div>
        <div className="flex justify-between">
          <dt className="text-body-sm text-stone">Desconto</dt>
          <dd className="text-body-sm text-charcoal tabular-nums">
            − {formatarMoeda(pedido.descontoCentavos)}
          </dd>
        </div>
        <div className="border-hairline-light flex justify-between border-t pt-2">
          <dt className="text-body-md text-ink font-semibold">Total</dt>
          <dd className="text-body-md text-ink font-semibold tabular-nums">
            {formatarMoeda(pedido.totalCentavos)}
          </dd>
        </div>
      </dl>
    </div>
  );
}
