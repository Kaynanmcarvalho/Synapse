import type { Alinhamento, Ordenacao, PapelDeColuna } from '@synapse/sdl';
import type { StockIntelligenceMetric } from './stock-intelligence.api';

/** As colunas da tabela de inteligência: o que cada uma mostra e como ordena.
 *  Fora do componente pelo mesmo motivo de `credit/fila/colunas.ts` — é
 *  regra, e regra se testa. */

export type IdDeColuna =
  'product' | 'abc' | 'stock' | 'turnover' | 'coverage' | 'stockouts' | 'suggestion';

export interface DefinicaoDeColuna {
  readonly id: IdDeColuna;
  readonly rotulo: string;
  readonly papel: PapelDeColuna;
  readonly alinhamento: Alinhamento;
  readonly valorDeOrdenacao: (metric: StockIntelligenceMetric) => string | number;
}

export const COLUNAS: readonly DefinicaoDeColuna[] = [
  {
    id: 'product',
    rotulo: 'Produto',
    papel: 'primary',
    alinhamento: 'esquerda',
    valorDeOrdenacao: (m) => m.productName,
  },
  {
    id: 'abc',
    rotulo: 'ABC',
    papel: 'status',
    alinhamento: 'centro',
    valorDeOrdenacao: (m) => m.abc.byRevenue,
  },
  {
    id: 'stock',
    rotulo: 'Estoque',
    papel: 'data',
    alinhamento: 'direita',
    valorDeOrdenacao: (m) => m.stockOnHand,
  },
  {
    id: 'turnover',
    rotulo: 'Giro',
    papel: 'data',
    alinhamento: 'direita',
    valorDeOrdenacao: (m) => m.turnoverRate,
  },
  {
    id: 'coverage',
    rotulo: 'Cobertura',
    papel: 'data',
    alinhamento: 'direita',
    valorDeOrdenacao: (m) => m.coverageDays ?? Number.POSITIVE_INFINITY,
  },
  {
    id: 'stockouts',
    rotulo: 'Rupturas',
    papel: 'data',
    alinhamento: 'direita',
    valorDeOrdenacao: (m) => m.stockoutCount,
  },
  {
    id: 'suggestion',
    rotulo: 'Sugestão de compra',
    papel: 'action',
    alinhamento: 'direita',
    valorDeOrdenacao: (m) => m.approvedPurchaseQty ?? m.suggestedPurchaseQty,
  },
];

/** Ciclo de 3 estados do DataTable legado: asc → desc → nenhuma ordenação.
 *  Clicar numa coluna diferente sempre recomeça em asc. Diferente do ciclo de
 *  2 estados da fundação (`proximaOrdenacao`, usado pela fila) — lá sempre
 *  existe uma coluna ordenada; aqui "nenhuma ordenação" é um estado real que
 *  a tela já tinha, então não força a fundação a fingir que não existe. */
export const proximaOrdenacaoOuNenhuma = (
  atual: Ordenacao<IdDeColuna> | null,
  coluna: IdDeColuna,
): Ordenacao<IdDeColuna> | null => {
  if (atual?.coluna !== coluna) return { coluna, direcao: 'asc' };
  if (atual.direcao === 'asc') return { coluna, direcao: 'desc' };
  return null;
};

export const ordenar = (
  linhas: readonly StockIntelligenceMetric[],
  ordenacao: Ordenacao<IdDeColuna> | null,
): readonly StockIntelligenceMetric[] => {
  if (!ordenacao) return linhas;
  const coluna = COLUNAS.find((c) => c.id === ordenacao.coluna);
  if (!coluna) return linhas;
  const sinal = ordenacao.direcao === 'asc' ? 1 : -1;
  return [...linhas].sort((a, b) => {
    const va = coluna.valorDeOrdenacao(a);
    const vb = coluna.valorDeOrdenacao(b);
    if (va < vb) return -1 * sinal;
    if (va > vb) return 1 * sinal;
    return 0;
  });
};

/** Busca livre client-side, do jeito que o DataTable legado já fazia: casa
 *  nome ou SKU, sem acento/caixa. */
export const filtrar = (
  linhas: readonly StockIntelligenceMetric[],
  busca: string,
): readonly StockIntelligenceMetric[] => {
  const termo = busca.trim().toLocaleLowerCase('pt-BR');
  if (!termo) return linhas;
  return linhas.filter((m) =>
    `${m.productName} ${m.sku}`.toLocaleLowerCase('pt-BR').includes(termo),
  );
};
