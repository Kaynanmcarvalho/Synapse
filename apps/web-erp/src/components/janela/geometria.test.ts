import { describe, expect, it } from 'vitest';
import { aoAbrir, limitar, MARGEM, maximizar, MINIMO, mover, redimensionar } from './geometria';

const AREA = { largura: 1600, altura: 900, topo: 112 };
const JANELA = { x: 200, y: 200, largura: 800, altura: 500 };

describe('limitar a janela na tela', () => {
  it('nao deixa passar da borda direita nem da de baixo', () => {
    expect(limitar({ ...JANELA, x: 1500, y: 800 }, AREA)).toMatchObject({
      x: 1600 - 800 - MARGEM,
      y: 900 - 500 - MARGEM,
    });
  });

  it('nao deixa subir por cima do cabecalho', () => {
    expect(limitar({ ...JANELA, y: 0 }, AREA).y).toBe(AREA.topo + MARGEM);
  });

  it('encolhe a janela maior que a area, mantendo o minimo', () => {
    const grande = limitar({ x: 0, y: 0, largura: 5000, altura: 5000 }, AREA);
    expect(grande.largura).toBe(AREA.largura - MARGEM * 2);
    expect(grande.altura).toBe(AREA.altura - AREA.topo - MARGEM * 2);
    expect(limitar({ ...JANELA, largura: 10, altura: 10 }, AREA)).toMatchObject(MINIMO);
  });
});

describe('mover', () => {
  it('soma o deslocamento e continua dentro da tela', () => {
    expect(mover(JANELA, 50, -30, AREA)).toMatchObject({ x: 250, y: 170 });
    expect(mover(JANELA, -1000, 0, AREA).x).toBe(MARGEM);
  });
});

describe('redimensionar', () => {
  it('pela direita cresce sem mover o canto', () => {
    const nova = redimensionar(JANELA, 'direita', 120, 0, AREA);
    expect(nova).toMatchObject({ x: 200, largura: 920 });
  });

  it('pela esquerda encolhe e anda com a borda, deixando a direita parada', () => {
    const nova = redimensionar(JANELA, 'esquerda', 100, 0, AREA);
    expect(nova.x).toBe(300);
    expect(nova.largura).toBe(700);
    expect(nova.x + nova.largura).toBe(JANELA.x + JANELA.largura);
  });

  it('respeita a largura minima sem empurrar a janela', () => {
    const nova = redimensionar(JANELA, 'esquerda', 900, 0, AREA);
    expect(nova.largura).toBe(MINIMO.largura);
    expect(nova.x).toBe(JANELA.x + JANELA.largura - MINIMO.largura);
  });

  it('pelo canto de baixo muda largura e altura juntas', () => {
    expect(redimensionar(JANELA, 'baixo-direita', 60, 40, AREA)).toMatchObject({
      largura: 860,
      altura: 540,
    });
  });
});

describe('maximizar e abrir', () => {
  it('maximizada ocupa a area util inteira, abaixo do cabecalho', () => {
    expect(maximizar(AREA)).toEqual({
      x: MARGEM,
      y: AREA.topo + MARGEM,
      largura: AREA.largura - MARGEM * 2,
      altura: AREA.altura - AREA.topo - MARGEM * 2,
    });
  });

  it('abre com a fracao pedida e o alinhamento pedido', () => {
    const esquerda = aoAbrir(AREA, 0.3, 0.9, 'esquerda');
    expect(esquerda.x).toBe(MARGEM);
    expect(esquerda.largura).toBe(Math.round((AREA.largura - MARGEM * 2) * 0.3));

    const direita = aoAbrir(AREA, 0.5, 0.5, 'direita');
    expect(direita.x + direita.largura).toBe(AREA.largura - MARGEM);
  });
});
