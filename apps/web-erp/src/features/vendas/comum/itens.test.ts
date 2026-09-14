import type { Product } from '@synapse/types';
import { describe, expect, it } from 'vitest';
import { lerEtiquetaDeBalanca, quantidadeDaEtiqueta } from './balanca';
import {
  descontarDocumento,
  descontoDoPrecoDigitado,
  escreverQuantidade,
  lerQuantidade,
  linhaDoProduto,
  separarMultiplicador,
  simularDesconto,
  totalizar,
} from './itens';
import { nomeDaTecla } from './useAtalhosDaTela';

const produto = (id: string, extra: Partial<Product> = {}): Product =>
  ({
    id,
    sku: `SKU-${id}`,
    name: `RACAO ${id}`,
    categoryId: 'racoes',
    status: 'active',
    logistics: { unit: 'SC', weightKg: 25 },
    pricing: { salePrice: 98.96 },
    ...extra,
  }) as unknown as Product;

describe('itens da venda', () => {
  it('lê e escreve quantidade em milésimos, no jeito brasileiro', () => {
    expect(lerQuantidade('1')).toBe(1_000);
    expect(lerQuantidade('1,5')).toBe(1_500);
    expect(lerQuantidade('0,125')).toBe(125);
    expect(lerQuantidade('1.000')).toBe(1_000_000);
    expect(lerQuantidade('0')).toBeNull();
    expect(lerQuantidade('1,2345')).toBeNull();
    expect(lerQuantidade('abc')).toBeNull();
    expect(escreverQuantidade(1_500)).toBe('1,5');
    expect(escreverQuantidade(2_000)).toBe('2');
  });

  it('soma itens, volumes, peso, bruto, descontos e líquido', () => {
    const linhas = [
      linhaDoProduto(produto('a'), { quantidade: 2_000, precoCentavos: 9_896 }),
      linhaDoProduto(produto('b'), {
        quantidade: 500,
        precoCentavos: 1_000,
        descontoCentavos: 100,
      }),
    ];
    expect(totalizar(linhas)).toEqual({
      itens: 2,
      volumes: 2.5,
      pesoKg: 62.5,
      brutoCentavos: 19_792 + 500,
      descontosCentavos: 100,
      liquidoCentavos: 20_192,
    });
  });

  it('preço digitado abaixo da tabela vira desconto; acima não gera desconto', () => {
    expect(descontoDoPrecoDigitado(1_000, 9_896, 9_000)).toBe(896);
    expect(descontoDoPrecoDigitado(2_000, 9_896, 9_000)).toBe(1_792);
    expect(descontoDoPrecoDigitado(1_000, 9_896, 10_000)).toBe(0);
  });

  it('desconto em valor no documento é repartido sem sobrar nem faltar centavo', () => {
    const linhas = [
      linhaDoProduto(produto('a'), { quantidade: 1_000, precoCentavos: 3_333 }),
      linhaDoProduto(produto('b'), { quantidade: 1_000, precoCentavos: 3_333 }),
      linhaDoProduto(produto('c'), { quantidade: 1_000, precoCentavos: 3_334 }),
    ];
    const descontadas = descontarDocumento(linhas, { tipo: 'valor', valor: 1_000 });
    expect(descontadas.reduce((soma, linha) => soma + linha.descontoCentavos, 0)).toBe(1_000);
    const percentual = descontarDocumento(linhas, { tipo: 'percentual', valor: 10 });
    expect(percentual.map((linha) => linha.descontoCentavos)).toEqual([333, 333, 333]);
  });

  it('simula o desconto e recusa mais que o valor dos itens', () => {
    const linha = linhaDoProduto(produto('a'), { quantidade: 1_000, precoCentavos: 5_000 });
    expect(simularDesconto([linha], linha, { tipo: 'valor', valor: 6_000 }).invalido).toBe(true);
    const valida = simularDesconto([linha], null, { tipo: 'percentual', valor: 10 });
    expect(valida).toMatchObject({ invalido: false, percentual: 10 });
    expect(valida.totais.liquidoCentavos).toBe(4_500);
  });

  it('separa o multiplicador "3*código"', () => {
    expect(separarMultiplicador('3*7891000100103')).toEqual({
      codigo: '7891000100103',
      quantidade: '3',
    });
    expect(separarMultiplicador('1,5 * MUSS-KG')).toEqual({ codigo: 'MUSS-KG', quantidade: '1,5' });
    expect(separarMultiplicador('RC-20KG')).toEqual({ codigo: 'RC-20KG', quantidade: null });
  });
});

describe('etiqueta de balança', () => {
  it('lê código e peso e confere o dígito verificador', () => {
    // 2 00123 01250 + DV
    expect(lerEtiquetaDeBalanca('2001230125004')).toEqual({
      codigoDoProduto: '00123',
      numero: 1_250,
    });
    expect(lerEtiquetaDeBalanca('2001230125005')).toBeNull();
    expect(lerEtiquetaDeBalanca('7891000100103')).toBeNull();
  });

  it('peso em gramas é a quantidade; valor divide pelo preço do quilo', () => {
    const etiqueta = { codigoDoProduto: '00123', numero: 1_250 };
    expect(quantidadeDaEtiqueta(etiqueta, 'peso', 4_990)).toBe(1_250);
    expect(quantidadeDaEtiqueta(etiqueta, 'valor', 5_000)).toBe(250);
    expect(quantidadeDaEtiqueta({ ...etiqueta, numero: 0 }, 'peso', 5_000)).toBeNull();
  });
});

describe('teclas da tela', () => {
  it('dá nome às teclas como aparecem nos botões', () => {
    const tecla = (key: string, extra: Partial<KeyboardEvent> = {}) =>
      nomeDaTecla({
        key,
        ctrlKey: false,
        metaKey: false,
        altKey: false,
        shiftKey: false,
        ...extra,
      });
    expect(tecla('F3')).toBe('F3');
    expect(tecla('x', { ctrlKey: true })).toBe('Ctrl+X');
    expect(tecla('d', { metaKey: true })).toBe('Ctrl+D');
    expect(tecla('n', { altKey: true })).toBe('Alt+N');
    expect(tecla('1', { altKey: true })).toBe('Alt+1');
    expect(tecla('F7', { shiftKey: true })).toBe('Shift+F7');
  });
});
