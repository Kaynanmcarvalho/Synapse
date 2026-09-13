import { describe, expect, it } from 'vitest';
import {
  documentoCompleto,
  escreverMoeda,
  lerMoeda,
  mascararCep,
  mascararDocumento,
} from './campos';

describe('mascaras do cadastro', () => {
  it('mascara CNPJ e CPF enquanto se digita', () => {
    expect(mascararDocumento('12345678000190')).toBe('12.345.678/0001-90');
    expect(mascararDocumento('123456780001')).toBe('12.345.678/0001');
    expect(mascararDocumento('52998224725')).toBe('529.982.247-25');
    expect(mascararDocumento('529982')).toBe('529.982');
  });

  it('mascara o CEP', () => {
    expect(mascararCep('74230020')).toBe('74230-020');
    expect(mascararCep('742')).toBe('742');
  });

  it('diz quando o documento esta completo', () => {
    expect(documentoCompleto('12.345.678/0001-90')).toBe(true);
    expect(documentoCompleto('529.982.247-25')).toBe(true);
    expect(documentoCompleto('123')).toBe(false);
  });
});

describe('valor em reais', () => {
  it('le o que se digita no campo de dinheiro', () => {
    expect(lerMoeda('15.000,50')).toBe(1_500_050);
    expect(lerMoeda('15000,5')).toBe(1_500_050);
    expect(lerMoeda('R$ 200')).toBe(20_000);
    expect(lerMoeda('')).toBe(0);
  });

  it('escreve centavos no formato do campo', () => {
    expect(escreverMoeda(1_500_050)).toBe('15.000,50');
    expect(escreverMoeda(0)).toBe('0,00');
  });
});
