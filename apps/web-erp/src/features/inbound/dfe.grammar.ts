import type { TomDeStatus } from '@synapse/sdl';
import type { DfeEntry } from './dfe.api';

/** As 4 situações de conferência de um DF-e já encaixam nos tons que o
 *  Status do SDL tem — nenhum tom novo foi necessário (mesma decisão de
 *  Boletos e Compras). `RECUSADA` está no tipo mas sem nenhuma transição em
 *  código, backend ou frontend (mesmo caso de `CANCELADO` em Purchasing,
 *  Fase 7.3) — fora de escopo desta fase. */
export const TOM_DA_SITUACAO: Record<DfeEntry['conferencia']['situacao'], TomDeStatus> = {
  PENDENTE: 'pendente',
  CONFERIDA: 'ok',
  RECUSADA: 'perigo',
  LANCADA: 'info',
};

export const SITUACAO_LABEL: Record<DfeEntry['conferencia']['situacao'], string> = {
  PENDENTE: 'Pendente',
  CONFERIDA: 'Conferida',
  RECUSADA: 'Recusada',
  LANCADA: 'Lançada',
};

/** Rascunho de edição de um item — os campos numéricos ficam como texto
 *  digitável (mesma convenção de `NewOrderForm`/cotações em Purchasing):
 *  converter a cada tecla via `lerQuantidade`/`lerMoeda` e reescrever com
 *  `escreverQuantidade`/`escreverMoeda` brigaria com o que a pessoa está
 *  digitando. A conversão para os inteiros que a API espera (milésimos,
 *  centavos) só acontece no momento de conferir a linha. */
export interface RascunhoDoItem {
  readonly productId: string;
  readonly quantidadeTexto: string;
  readonly custoTexto: string;
  readonly lote: string;
  readonly validade: string;
}
