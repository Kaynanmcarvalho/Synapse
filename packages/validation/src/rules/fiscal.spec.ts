import { describe, expect, it } from 'vitest';
import { isValidCest, isValidEan, isValidNcm } from './fiscal';

describe('isValidEan', () => {
  it('aceita EAN-8, UPC-12, EAN-13 e GTIN-14 validos', () => {
    expect(isValidEan('40170725')).toBe(true);
    expect(isValidEan('036000291452')).toBe(true);
    expect(isValidEan('4006381333931')).toBe(true);
    expect(isValidEan('12345678901231')).toBe(true);
  });

  it('aceita com espacos ou hifens, pois so os digitos importam', () => {
    expect(isValidEan('4006381-333931')).toBe(true);
  });

  it('recusa digito verificador errado e tamanho invalido', () => {
    expect(isValidEan('4006381333930')).toBe(false);
    expect(isValidEan('123456')).toBe(false);
  });
});

describe('isValidNcm', () => {
  it('aceita 8 digitos e recusa outro tamanho', () => {
    expect(isValidNcm('23099090')).toBe(true);
    expect(isValidNcm('2309909')).toBe(false);
  });
});

describe('isValidCest', () => {
  it('aceita 7 digitos e recusa outro tamanho', () => {
    expect(isValidCest('1234567')).toBe(true);
    expect(isValidCest('123456')).toBe(false);
  });
});
