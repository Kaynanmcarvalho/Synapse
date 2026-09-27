/** Largura de campo derivada do dado, não de coluna: um código cabe em 8rem,
 *  uma quantidade em 10rem, um nome ocupa o que sobrar. Em 1280 a linha quebra
 *  inteira no lugar certo, em vez de espremer cada campo. Grade de 12 colunas
 *  foi descartada de propósito: ela dá a um CEP e a uma razão social a mesma
 *  unidade de medida. */
export type LarguraDeCampo = 'codigo' | 'curto' | 'medio' | 'longo' | 'resto';

export const LARGURA_DE_CAMPO: Readonly<Record<LarguraDeCampo, string>> = {
  codigo: 'w-32',
  curto: 'w-40',
  medio: 'w-64',
  longo: 'w-96 max-w-full',
  resto: 'min-w-[16rem] flex-1',
};
