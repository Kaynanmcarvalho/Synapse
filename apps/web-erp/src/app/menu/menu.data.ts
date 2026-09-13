import type { MenuPrincipal } from './menu.types';
import { CADASTROS } from './menus/cadastros';
import { CONFIGURACOES } from './menus/configuracoes';
import { ESTOQUE } from './menus/estoque';
import { FERRAMENTAS } from './menus/ferramentas';
import { FINANCEIRO } from './menus/financeiro';
import { PRODUTIVIDADE } from './menus/produtividade';
import { ROTINAS_FISCAIS } from './menus/rotinas-fiscais';
import { SUPORTE } from './menus/suporte';
import { VENDAS } from './menus/vendas';

/** A barra de menus do Syndata, na mesma ordem e com as mesmas opcoes — quem
 *  migra encontra cada rotina onde ja estava acostumado a procurar. Cada menu
 *  mora num arquivo proprio em `menus/`.
 *
 *  Item com `para` abre uma tela que ja existe no Synapse. Item sem `para` leva
 *  a /modulo/<id>, que mostra onde a opcao mora e que ela ainda vem.
 *
 *  Os submenus de Cadastros, Vendas, Estoque e Financeiro vieram dos prints do
 *  Syndata. O que ainda nao foi fotografado esta marcado com [inferido] no
 *  arquivo do menu. */
export const MENUS: readonly MenuPrincipal[] = [
  CADASTROS,
  VENDAS,
  ESTOQUE,
  FINANCEIRO,
  PRODUTIVIDADE,
  ROTINAS_FISCAIS,
  CONFIGURACOES,
  FERRAMENTAS,
  SUPORTE,
];
