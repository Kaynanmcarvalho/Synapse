/** Mascaras e leituras do formulario de cadastro. Puras, para caber em teste. */

const digitos = (valor: string): string => valor.replace(/\D/g, '');

/** CPF ou CNPJ mascarado enquanto se digita. */
export const mascararDocumento = (valor: string): string => {
  const numeros = digitos(valor).slice(0, 14);
  if (numeros.length <= 11) {
    return numeros
      .replace(/^(\d{3})(\d)/, '$1.$2')
      .replace(/^(\d{3})\.(\d{3})(\d)/, '$1.$2.$3')
      .replace(/\.(\d{3})(\d{1,2})$/, '.$1-$2');
  }
  return numeros
    .replace(/^(\d{2})(\d)/, '$1.$2')
    .replace(/^(\d{2})\.(\d{3})(\d)/, '$1.$2.$3')
    .replace(/\.(\d{3})(\d)/, '.$1/$2')
    .replace(/(\d{4})(\d{1,2})$/, '$1-$2');
};

export const mascararCep = (valor: string): string =>
  digitos(valor)
    .slice(0, 8)
    .replace(/^(\d{5})(\d)/, '$1-$2');

/** "15.000,50" ou "15000,5" para centavos. Vazio vira zero. */
export const lerMoeda = (valor: string): number => {
  const limpo = valor.replace(/[^\d,]/g, '');
  if (!limpo) return 0;
  const [inteiro = '0', decimal = ''] = limpo.split(',');
  return Number(inteiro) * 100 + Number(decimal.padEnd(2, '0').slice(0, 2));
};

export const escreverMoeda = (centavos: number): string =>
  (centavos / 100).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

export const documentoCompleto = (valor: string): boolean => {
  const tamanho = digitos(valor).length;
  return tamanho === 11 || tamanho === 14;
};
