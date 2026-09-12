import type { FeatureKey } from '../useTenantExperience';

/** `disponivel`: abre uma tela que ja existe. `em-breve`: a opcao existe no menu
 *  (para quem vem do Syndata achar tudo no mesmo lugar), mas a tela ainda nao. */
export type SituacaoDoItem = 'disponivel' | 'em-breve';

export interface Atalho {
  readonly tecla: string;
  readonly ctrl: boolean;
  readonly alt: boolean;
  readonly shift: boolean;
  /** Como aparece no menu: `Ctrl+F8`. */
  readonly rotulo: string;
}

export interface ItemDeMenu {
  readonly tipo: 'item';
  /** Trilha de slugs, unica no menu todo: `vendas/venda-balcao`. */
  readonly id: string;
  readonly rotulo: string;
  readonly caminho: string;
  readonly situacao: SituacaoDoItem;
  /** Rotulos do menu ate o item, para breadcrumb e busca. */
  readonly trilha: readonly string[];
  readonly atalho?: Atalho;
  readonly feature?: FeatureKey;
}

export interface SubmenuDeMenu {
  readonly tipo: 'submenu';
  readonly id: string;
  readonly rotulo: string;
  readonly itens: readonly EntradaDeMenu[];
  readonly feature?: FeatureKey;
}

export interface SeparadorDeMenu {
  readonly tipo: 'separador';
  readonly id: string;
}

export type EntradaDeMenu = ItemDeMenu | SubmenuDeMenu | SeparadorDeMenu;

export interface MenuPrincipal {
  readonly id: string;
  readonly rotulo: string;
  readonly itens: readonly EntradaDeMenu[];
}

/** Forma de escrever o menu antes de ganhar id, caminho e trilha. */
export type EsbocoDeEntrada =
  | { readonly tipo: 'separador' }
  | {
      readonly tipo: 'item';
      readonly rotulo: string;
      readonly para?: string;
      readonly atalho?: string;
      readonly feature?: FeatureKey;
    }
  | {
      readonly tipo: 'submenu';
      readonly rotulo: string;
      readonly itens: readonly EsbocoDeEntrada[];
      readonly feature?: FeatureKey;
    };
