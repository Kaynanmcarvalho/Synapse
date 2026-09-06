import { describe, expect, it } from 'vitest';
import { isValidCnpj, isValidCpf, isValidCpfOrCnpj } from './document';

describe('isValidCpf', () => {
  it('aceita um CPF valido, com ou sem mascara', () => {
    expect(isValidCpf('529.982.247-25')).toBe(true);
    expect(isValidCpf('52998224725')).toBe(true);
  });

  it('recusa digito verificador errado, tamanho errado e digitos repetidos', () => {
    expect(isValidCpf('52998224724')).toBe(false);
    expect(isValidCpf('5299822472')).toBe(false);
    expect(isValidCpf('11111111111')).toBe(false);
  });
});

describe('isValidCnpj', () => {
  it('aceita um CNPJ valido', () => {
    expect(isValidCnpj('11.222.333/0001-81')).toBe(true);
  });

  it('recusa digito verificador errado', () => {
    expect(isValidCnpj('11222333000182')).toBe(false);
  });
});

describe('isValidCpfOrCnpj', () => {
  it('escolhe a regra pelo tamanho', () => {
    expect(isValidCpfOrCnpj('52998224725')).toBe(true);
    expect(isValidCpfOrCnpj('11222333000181')).toBe(true);
    expect(isValidCpfOrCnpj('123')).toBe(false);
  });
});
