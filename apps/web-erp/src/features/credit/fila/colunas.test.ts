import type { PedidoNaFila } from '@synapse/types';
import { describe, expect, it } from 'vitest';
import {
  alternarColuna,
  aplicarAtalho,
  filtrarFila,
  moverColuna,
  larguraPadrao,
  limitarLargura,
  ordenarFila,
  ORDEM_PADRAO,
  proximaOrdenacao,
  totaisDaFila,
  type IdDaColuna,
} from './colunas';

const linha = (
  numero: number,
  clienteNome: string,
  totalCentavos: number,
  extra: {
    readonly cidade?: string;
    readonly vencidoCentavos?: number;
    readonly titulosVencidos?: number;
    readonly diasDeAtrasoMaximo?: number;
    readonly aVencerCentavos?: number;
    readonly tipo?: string;
    readonly enviadoEm?: string;
    readonly customerId?: string;
    readonly impresso?: boolean;
  } = {},
): PedidoNaFila =>
  ({
    pedido: {
      numero,
      customerId: extra.customerId ?? `cliente-${clienteNome}`,
      clienteNome,
      clienteDocumento: '12345678000190',
      clienteCidade: extra.cidade ?? 'Goiânia',
      clienteBairro: 'Centro',
      formaDePagamento: 'Boleto',
      condicaoDePagamento: '28/35/42 dias',
      prazoMedioEmDias: 35,
      vendedorNome: 'Marcos',
      origem: 'MOBILE',
      tipo: extra.tipo ?? 'VENDA',
      itens: [],
      enviadoEm: extra.enviadoEm ?? '2026-09-10T10:00:00.000Z',
      totalCentavos,
    },
    impresso: extra.impresso ?? false,
    cliente: {
      vencidoCentavos: extra.vencidoCentavos ?? 0,
      aVencerCentavos: extra.aVencerCentavos ?? 0,
      titulosVencidos: extra.titulosVencidos ?? 0,
      diasDeAtrasoMaximo: extra.diasDeAtrasoMaximo ?? 0,
    },
  }) as unknown as PedidoNaFila;

const numeros = (linhas: readonly PedidoNaFila[]) => linhas.map((l) => l.pedido.numero);

describe('ordenação por dois cliques', () => {
  const linhas = [linha(1, 'Zeta Alimentos', 5_000), linha(2, 'Ábaco Mercado', 90_000)];

  it('valor: crescente e depois decrescente', () => {
    expect(numeros(ordenarFila(linhas, { coluna: 'valor', direcao: 'asc' }))).toEqual([1, 2]);
    expect(numeros(ordenarFila(linhas, { coluna: 'valor', direcao: 'desc' }))).toEqual([2, 1]);
  });

  it('cliente: A-Z e depois Z-A, sem tropeçar no acento', () => {
    expect(numeros(ordenarFila(linhas, { coluna: 'cliente', direcao: 'asc' }))).toEqual([2, 1]);
    expect(numeros(ordenarFila(linhas, { coluna: 'cliente', direcao: 'desc' }))).toEqual([1, 2]);
  });

  it('o segundo duplo clique inverte; em outra coluna recomeça crescente', () => {
    const primeiro = proximaOrdenacao({ coluna: 'enviadoEm', direcao: 'desc' }, 'valor');
    expect(primeiro).toEqual({ coluna: 'valor', direcao: 'asc' });
    expect(proximaOrdenacao(primeiro, 'valor')).toEqual({ coluna: 'valor', direcao: 'desc' });
    expect(proximaOrdenacao(primeiro, 'cliente')).toEqual({ coluna: 'cliente', direcao: 'asc' });
  });

  it('empate desempata pelo número do pedido, para a lista não dançar', () => {
    const iguais = [linha(9, 'Loja', 1_000), linha(3, 'Loja', 1_000)];
    expect(numeros(ordenarFila(iguais, { coluna: 'cliente', direcao: 'asc' }))).toEqual([3, 9]);
  });
});

describe('colunas do usuário', () => {
  const ordem: readonly IdDaColuna[] = ['pedido', 'cliente', 'cidade', 'valor'];

  it('arrastar leva a coluna para a posição da outra', () => {
    expect(moverColuna(ordem, 'valor', 'cliente')).toEqual([
      'pedido',
      'valor',
      'cliente',
      'cidade',
    ]);
    expect(moverColuna(ordem, 'valor', 'valor')).toEqual(ordem);
  });

  it('esconder tira a coluna; mostrar devolve na posição de sempre', () => {
    const semCidade = alternarColuna(ordem, 'cidade');
    expect(semCidade).toEqual(['pedido', 'cliente', 'valor']);
    expect(alternarColuna(semCidade, 'cidade')).toEqual(['pedido', 'cliente', 'cidade', 'valor']);
  });
});

describe('largura das colunas', () => {
  it('respeita o minimo, o maximo e arredonda', () => {
    expect(limitarLargura(10)).toBe(64);
    expect(limitarLargura(5_000)).toBe(640);
    expect(limitarLargura(180.4)).toBe(180);
  });

  it('a largura de fabrica e a que o duplo clique devolve', () => {
    expect(larguraPadrao('valor')).toBe(142);
  });
});

describe('busca e atalhos', () => {
  const linhas = [
    linha(1, 'Mercado do Bairro', 1_000, {
      cidade: 'Goiânia',
      titulosVencidos: 2,
      vencidoCentavos: 5_000,
      diasDeAtrasoMaximo: 12,
    }),
    linha(2, 'Padaria Estrela', 2_000, { cidade: 'Anápolis', tipo: 'TROCA' }),
    linha(3, 'Atacado Sul', 3_000, {
      cidade: 'Anápolis',
      aVencerCentavos: 900,
      enviadoEm: '2026-09-13T08:00:00.000Z',
      impresso: true,
    }),
  ];

  it('busca ignora acento e caixa, e só olha as colunas visíveis', () => {
    expect(numeros(filtrarFila(linhas, 'anapolis', ORDEM_PADRAO))).toEqual([2, 3]);
    expect(numeros(filtrarFila(linhas, 'MERCADO', ORDEM_PADRAO))).toEqual([1]);
    expect(numeros(filtrarFila(linhas, 'anapolis', ['cliente']))).toEqual([]);
  });

  it('atalhos separam quem deve, quem não deve, o que não é venda e o que falta imprimir', () => {
    expect(numeros(aplicarAtalho(linhas, 'com-atraso'))).toEqual([1]);
    expect(numeros(aplicarAtalho(linhas, 'sem-titulo'))).toEqual([2]);
    expect(numeros(aplicarAtalho(linhas, 'nao-venda'))).toEqual([2]);
    expect(numeros(aplicarAtalho(linhas, 'nao-impressos'))).toEqual([1, 2]);
    expect(numeros(aplicarAtalho(linhas, 'todos'))).toEqual([1, 2, 3]);
  });

  it('totais contam a dívida do cliente uma vez, mesmo com dois pedidos dele', () => {
    const doisPedidos = [
      linha(1, 'Mercado', 1_000, { customerId: 'c1', vencidoCentavos: 5_000 }),
      linha(2, 'Mercado', 4_000, { customerId: 'c1', vencidoCentavos: 5_000 }),
    ];
    expect(totaisDaFila(doisPedidos)).toEqual({
      pedidos: 2,
      valorCentavos: 5_000,
      vencidoCentavos: 5_000,
      clientes: 1,
    });
  });
});
