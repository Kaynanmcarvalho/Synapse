/** Busca de telas/menu para a Command Window (Fase 4.1) — pura, sem rede: o
 *  menu ja e data-driven (id, rotulo, trilha, caminho, situacao), entao
 *  pesquisar "credito" e achar "Análise de Crédito" e so questao de comparar
 *  texto normalizado contra o que ja existe. Reaproveita `normalizarTexto` e
 *  `todosOsItens` da Fase 3 (menu.utils.ts) — mesma normalizacao do
 *  type-ahead da barra, sem duplicar funcao. */

import type { ItemDeMenu, MenuPrincipal } from '../../app/menu/menu.types';
import { normalizarTexto, todosOsItens } from '../../app/menu/menu.utils';

/** Alem de acento e caixa, tira a pontuacao que separa siglas do jeito que o
 *  cadastro do menu escreve ("NF-e", "CT-e") do jeito que quem procura de
 *  cabeca digita ("nfe", "cte") — sem isso "nfe" nao acha "(NF-e)" porque o
 *  hifen fica no meio dos dois "match" parciais. So para comparar; a busca
 *  continua sem duplicar `normalizarTexto` (seguem usando a mesma base). */
const normalizarParaComparacao = (texto: string): string =>
  normalizarTexto(texto).replace(/[-./()]/g, '');

/** Ranking deterministico (§19 da Fase 4.1): rotulo exato primeiro, depois
 *  comeco de rotulo, depois ocorrencia em qualquer parte do rotulo, depois
 *  trilha (o modulo/submenu, nao o item), e por ultimo o caminho da rota —
 *  um sinal mais fraco (e o slug da URL, nao texto pensado pra ser lido),
 *  mas e o que faz "boletos" achar `/financeiro/boletos` quando o rotulo de
 *  verdade e "Gerenciamento de Cobrança Bancária". `null` quando nao bate. */
const rankDoItem = (item: ItemDeMenu, alvo: string): number | null => {
  const rotulo = normalizarParaComparacao(item.rotulo);
  if (rotulo === alvo) return 0;
  if (rotulo.startsWith(alvo)) return 1;
  if (rotulo.includes(alvo)) return 2;
  const trilha = normalizarParaComparacao(item.trilha.slice(0, -1).join(' '));
  if (trilha.includes(alvo)) return 3;
  if (normalizarParaComparacao(item.caminho).includes(alvo)) return 4;
  return null;
};

export const buscarNaNavegacao = (
  menus: readonly MenuPrincipal[],
  consulta: string,
  limite = 6,
): readonly ItemDeMenu[] => {
  const alvo = normalizarParaComparacao(consulta.trim());
  if (!alvo) return [];

  const comRank = todosOsItens(menus)
    .map((item, indice) => ({ item, indice, rank: rankDoItem(item, alvo) }))
    .filter(
      (entrada): entrada is { item: ItemDeMenu; indice: number; rank: number } =>
        entrada.rank !== null,
    );
  comRank.sort((a, b) => a.rank - b.rank || a.indice - b.indice);
  return comRank.slice(0, limite).map((entrada) => entrada.item);
};

/** Estado vazio (§29): sem historico ou frequencia de verdade para mostrar
 *  "recentes", os itens que ja tem atalho de teclado sao uma curadoria real
 *  — nao inventada — de que rotinas importam o bastante para ter um. */
export const itensComAtalho = (menus: readonly MenuPrincipal[]): readonly ItemDeMenu[] =>
  todosOsItens(menus).filter((item) => item.atalho);

/** "Vendas › Restaurante" para um item dentro de Restaurante; so "Vendas"
 *  para um item direto do modulo — nunca repete o proprio rotulo do item. */
export const contextoDoItem = (item: ItemDeMenu): string => item.trilha.slice(0, -1).join(' › ');
