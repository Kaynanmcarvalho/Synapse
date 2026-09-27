import { describe, expect, it } from 'vitest';
import { analisarMoeda, separarMoeda } from './dinheiro';

/** Bug real (achado pelos testes da Fase 4.3): `Intl.NumberFormat('pt-BR',
 *  {style:'currency'})` separa "R$" do valor com U+00A0 (espaço sem quebra),
 *  não um espaço comum — por isso o teste usa o formato de verdade do
 *  `Intl.NumberFormat`, não uma string digitada à mão com espaço comum, que
 *  teria escondido o mesmo bug de novo. */
const moeda = (centavos: number) =>
  new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(centavos / 100);

describe('separarMoeda', () => {
  it('separa o "R$" do número quando o valor vem de Intl.NumberFormat (espaço sem quebra)', () => {
    expect(separarMoeda(moeda(2_000_000))).toEqual({ prefixo: 'R$', numero: '20.000,00' });
  });

  it('continua funcionando com espaço comum, se algum dia vier assim', () => {
    expect(separarMoeda('R$ 500,00')).toEqual({ prefixo: 'R$', numero: '500,00' });
  });

  it('uma contagem simples (sem "R$") não é separada', () => {
    expect(separarMoeda('6')).toEqual({ prefixo: null, numero: '6' });
  });
});

describe('analisarMoeda', () => {
  it.each<[string | null | undefined, number | null]>([
    ['12', 12],
    ['12,5', 12.5],
    ['12,50', 12.5],
    ['1.234,56', 1234.56],
    ['0,01', 0.01],
    ['', null],
    [null, null],
    [undefined, null],
    ['abc', null],
    ['12.50', 12.5],
    ['-12,50', -12.5],
    ['  12,50  ', 12.5],
    ['R$ 12,50', 12.5],
  ])('analisarMoeda(%o) === %o', (entrada, esperado) => {
    expect(analisarMoeda(entrada)).toBe(esperado);
  });
});
