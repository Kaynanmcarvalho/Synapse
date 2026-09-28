/** Geometria das janelas flutuantes: onde cabem, ate onde arrastam e quanto
 *  encolhem. Puro de proposito — e a parte que erra feio (janela que some da
 *  tela, janela que vira um risco) e que precisa de teste. */

export interface Geometria {
  readonly x: number;
  readonly y: number;
  readonly largura: number;
  readonly altura: number;
}

/** Espaco util: a tela menos a faixa do cabecalho, que continua clicavel. */
export interface Area {
  readonly largura: number;
  readonly altura: number;
  readonly topo: number;
}

export type Lado = 'direita' | 'esquerda' | 'baixo' | 'baixo-direita' | 'baixo-esquerda';

export const MINIMO = { largura: 340, altura: 220 } as const;
export const MARGEM = 8;

const entre = (valor: number, minimo: number, maximo: number): number =>
  Math.max(minimo, Math.min(valor, Math.max(minimo, maximo)));

/** Mantem a janela inteira dentro da area util. */
export const limitar = (geometria: Geometria, area: Area): Geometria => {
  const largura = entre(geometria.largura, MINIMO.largura, area.largura - MARGEM * 2);
  const altura = entre(geometria.altura, MINIMO.altura, area.altura - area.topo - MARGEM * 2);
  return {
    largura,
    altura,
    x: entre(geometria.x, MARGEM, area.largura - largura - MARGEM),
    y: entre(geometria.y, area.topo + MARGEM, area.altura - altura - MARGEM),
  };
};

export const mover = (geometria: Geometria, dx: number, dy: number, area: Area): Geometria =>
  limitar({ ...geometria, x: geometria.x + dx, y: geometria.y + dy }, area);

/** Arrastar a borda esquerda move o canto e encolhe: a borda direita fica
 *  parada, que e o que a mao espera. */
export const redimensionar = (
  geometria: Geometria,
  lado: Lado,
  dx: number,
  dy: number,
  area: Area,
): Geometria => {
  let { x, largura, altura } = geometria;

  if (lado.includes('direita')) largura = geometria.largura + dx;
  if (lado.includes('esquerda')) {
    largura = geometria.largura - dx;
    x = geometria.x + dx;
  }
  if (lado.includes('baixo')) altura = geometria.altura + dy;

  if (largura < MINIMO.largura) {
    if (lado.includes('esquerda')) x = geometria.x + (geometria.largura - MINIMO.largura);
    largura = MINIMO.largura;
  }

  return limitar({ x, y: geometria.y, largura, altura }, area);
};

export const maximizar = (area: Area): Geometria =>
  limitar(
    {
      x: MARGEM,
      y: area.topo + MARGEM,
      largura: area.largura - MARGEM * 2,
      altura: area.altura - area.topo - MARGEM * 2,
    },
    area,
  );

/** Tamanho de abertura: uma fracao da area util, encostada onde faz sentido —
 *  a fila a esquerda, a ficha do cliente ocupando o resto. */
export const aoAbrir = (
  area: Area,
  fracaoDaLargura: number,
  fracaoDaAltura: number,
  alinhamento: 'esquerda' | 'centro' | 'direita' = 'centro',
): Geometria => {
  const largura = Math.round((area.largura - MARGEM * 2) * fracaoDaLargura);
  const altura = Math.round((area.altura - area.topo - MARGEM * 2) * fracaoDaAltura);
  const x =
    alinhamento === 'esquerda'
      ? MARGEM
      : alinhamento === 'direita'
        ? area.largura - largura - MARGEM
        : Math.round((area.largura - largura) / 2);
  return limitar({ x, y: area.topo + MARGEM, largura, altura }, area);
};
