const onlyDigits = (value: string): string => value.replace(/\D/g, '');

/** Digito verificador GTIN (EAN-8, UPC-12, EAN-13 ou GTIN-14): da direita para a
 *  esquerda, pesos alternados 3 e 1, soma e completa ate o proximo multiplo de 10. */
const gtinCheckDigit = (digitsWithoutCheck: string): number => {
  let sum = 0;
  for (let i = 0; i < digitsWithoutCheck.length; i += 1) {
    const digit = Number(digitsWithoutCheck[digitsWithoutCheck.length - 1 - i]);
    const weight = i % 2 === 0 ? 3 : 1;
    sum += digit * weight;
  }
  return (10 - (sum % 10)) % 10;
};

const GTIN_LENGTHS = [8, 12, 13, 14] as const;

/** Valida EAN/GTIN nos quatro tamanhos usados em varejo (§5). */
export const isValidEan = (value: string): boolean => {
  const digits = onlyDigits(value);
  if (!(GTIN_LENGTHS as readonly number[]).includes(digits.length)) return false;

  const body = digits.slice(0, -1);
  const check = Number(digits.at(-1));
  return gtinCheckDigit(body) === check;
};

/** NCM: 8 digitos numericos. Nao valida contra a tabela oficial, so o formato. */
export const isValidNcm = (value: string): boolean => /^\d{8}$/.test(onlyDigits(value));

/** CEST: 7 digitos numericos. */
export const isValidCest = (value: string): boolean => /^\d{7}$/.test(onlyDigits(value));
