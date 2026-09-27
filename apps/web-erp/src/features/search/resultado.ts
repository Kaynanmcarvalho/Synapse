import type { ItemDeMenu } from '../../app/menu/menu.types';
import type { SearchResultItem } from './search.api';

export type Resultado =
  | { readonly tipo: 'navegacao'; readonly item: ItemDeMenu }
  | { readonly tipo: 'entidade'; readonly item: SearchResultItem };

export interface Grupo {
  readonly titulo: string;
  readonly resultados: readonly Resultado[];
}

export const caminhoDoResultado = (resultado: Resultado): string =>
  resultado.tipo === 'navegacao' ? resultado.item.caminho : resultado.item.path;
