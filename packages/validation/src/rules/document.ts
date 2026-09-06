const onlyDigits = (value: string): string => value.replace(/\D/g, '');

const checkDigit = (digits: string, weights: readonly number[]): number => {
  const sum = weights.reduce((acc, weight, index) => acc + weight * Number(digits[index] ?? 0), 0);
  const rest = sum % 11;
  return rest < 2 ? 0 : 11 - rest;
};

const CPF_FIRST = [10, 9, 8, 7, 6, 5, 4, 3, 2] as const;
const CPF_SECOND = [11, 10, 9, 8, 7, 6, 5, 4, 3, 2] as const;
const CNPJ_FIRST = [5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2] as const;
const CNPJ_SECOND = [6, 5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2] as const;

const allSameDigit = (digits: string): boolean => new Set(digits).size === 1;

export const isValidCpf = (value: string): boolean => {
  const digits = onlyDigits(value);
  if (digits.length !== 11 || allSameDigit(digits)) return false;
  const first = checkDigit(digits, CPF_FIRST);
  const second = checkDigit(digits, CPF_SECOND);
  return Number(digits[9]) === first && Number(digits[10]) === second;
};

export const isValidCnpj = (value: string): boolean => {
  const digits = onlyDigits(value);
  if (digits.length !== 14 || allSameDigit(digits)) return false;
  const first = checkDigit(digits, CNPJ_FIRST);
  const second = checkDigit(digits, CNPJ_SECOND);
  return Number(digits[12]) === first && Number(digits[13]) === second;
};

export const isValidCpfOrCnpj = (value: string): boolean => {
  const digits = onlyDigits(value);
  if (digits.length === 11) return isValidCpf(digits);
  if (digits.length === 14) return isValidCnpj(digits);
  return false;
};
