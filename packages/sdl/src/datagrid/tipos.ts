/** Tipos da fundação de DataGrid (Fase 5). Implementam a especificação visual
 *  já congelada — "Data Row v1", em `packages/sdl/README.md` — não criam
 *  linguagem nova.
 *
 *  Os papéis de coluna controlam tipografia/alinhamento/tratamento de
 *  metadado. Não carregam regra de negócio: uma coluna `status` não sabe o
 *  que é "vencido", só que deve reservar espaço para o primitive `Status`. */
export type PapelDeColuna =
  'leading' | 'primary' | 'secondary' | 'data' | 'status' | 'meta' | 'action';

export type Alinhamento = 'esquerda' | 'direita' | 'centro';

export type Direcao = 'asc' | 'desc';

export interface Ordenacao<TId extends string> {
  readonly coluna: TId;
  readonly direcao: Direcao;
}
