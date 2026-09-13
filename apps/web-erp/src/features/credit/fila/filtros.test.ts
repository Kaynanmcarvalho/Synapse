import type { PedidoNaFila } from '@synapse/types';
import { describe, expect, it } from 'vitest';
import { aplicarFiltros, FILTROS_VAZIOS, pagamentoDoPedido, temFiltro } from './filtros';

const linha = (extra: Record<string, unknown>): PedidoNaFila =>
  ({
    pedido: {
      numero: 101,
      clienteNome: 'Mercado do Bairro',
      vendedorNome: 'Marcos Vendas',
      enviadoEm: '2026-09-10T12:00:00.000Z',
      formaDePagamento: 'Boleto',
      condicaoDePagamento: '14/21/28/35',
      ...extra,
    },
    cliente: {},
    impresso: false,
  }) as unknown as PedidoNaFila;

const numeros = (linhas: readonly PedidoNaFila[]) => linhas.map((l) => l.pedido.numero);

describe('filtros da fila', () => {
  const linhas = [
    linha({ numero: 101 }),
    linha({ numero: 102, clienteNome: 'Padaria Estrela', vendedorNome: 'Rita Campos' }),
    linha({ numero: 203, enviadoEm: '2026-09-01T12:00:00.000Z' }),
  ];

  it('sem filtro, nada e escondido', () => {
    expect(temFiltro(FILTROS_VAZIOS)).toBe(false);
    expect(numeros(aplicarFiltros(linhas, FILTROS_VAZIOS))).toEqual([101, 102, 203]);
  });

  it('numero casa por pedaco, como quem digita so o final', () => {
    expect(numeros(aplicarFiltros(linhas, { ...FILTROS_VAZIOS, numero: '10' }))).toEqual([
      101, 102,
    ]);
    expect(numeros(aplicarFiltros(linhas, { ...FILTROS_VAZIOS, numero: '203' }))).toEqual([203]);
  });

  it('cliente e vendedor ignoram acento e caixa', () => {
    expect(numeros(aplicarFiltros(linhas, { ...FILTROS_VAZIOS, cliente: 'PADARIA' }))).toEqual([
      102,
    ]);
    expect(numeros(aplicarFiltros(linhas, { ...FILTROS_VAZIOS, vendedor: 'rita' }))).toEqual([102]);
  });

  it('periodo corta pelo dia de quem olha a tela', () => {
    expect(numeros(aplicarFiltros(linhas, { ...FILTROS_VAZIOS, de: '2026-09-05' }))).toEqual([
      101, 102,
    ]);
    expect(numeros(aplicarFiltros(linhas, { ...FILTROS_VAZIOS, ate: '2026-09-05' }))).toEqual([
      203,
    ]);
    expect(
      numeros(aplicarFiltros(linhas, { ...FILTROS_VAZIOS, de: '2026-09-01', ate: '2026-09-01' })),
    ).toEqual([203]);
  });

  it('filtros se somam', () => {
    expect(
      numeros(aplicarFiltros(linhas, { ...FILTROS_VAZIOS, cliente: 'mercado', numero: '203' })),
    ).toEqual([203]);
  });
});

describe('forma de pagamento com prazo real', () => {
  it('junta forma e prazo', () => {
    expect(pagamentoDoPedido(linha({}).pedido)).toBe('Boleto 14/21/28/35');
    expect(
      pagamentoDoPedido(linha({ formaDePagamento: 'Cheque', condicaoDePagamento: '14/21' }).pedido),
    ).toBe('Cheque 14/21');
    expect(
      pagamentoDoPedido(linha({ formaDePagamento: 'Cartão', condicaoDePagamento: '3x' }).pedido),
    ).toBe('Cartão 3x');
  });

  it('forma instantanea nao repete "à vista"', () => {
    expect(
      pagamentoDoPedido(linha({ formaDePagamento: 'PIX', condicaoDePagamento: 'À vista' }).pedido),
    ).toBe('PIX');
    expect(
      pagamentoDoPedido(
        linha({ formaDePagamento: 'Dinheiro', condicaoDePagamento: 'À vista' }).pedido,
      ),
    ).toBe('Dinheiro');
    expect(
      pagamentoDoPedido(
        linha({ formaDePagamento: 'Boleto', condicaoDePagamento: 'À vista' }).pedido,
      ),
    ).toBe('Boleto À vista');
  });

  it('nao repete a forma quando a condicao ja diz', () => {
    expect(
      pagamentoDoPedido(linha({ formaDePagamento: 'PIX', condicaoDePagamento: 'PIX' }).pedido),
    ).toBe('PIX');
    expect(
      pagamentoDoPedido(
        linha({ formaDePagamento: 'Cheque', condicaoDePagamento: 'Cheque 14/21' }).pedido,
      ),
    ).toBe('Cheque 14/21');
  });
});
