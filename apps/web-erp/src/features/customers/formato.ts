/** Máscaras e leituras do cadastro. Puras, para caberem em teste.
 *
 *  Máscara só entra quando o comprimento faz sentido: documento pela metade
 *  continua como foi digitado, porque máscara inventada atrapalha quem digita. */

export const digitos = (valor: string): string => valor.replace(/\D/g, '');

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

/** (62) 3241-5566 e (62) 99812-4455 — celular tem nove dígitos. */
export const mascararTelefone = (valor: string): string => {
  const numeros = digitos(valor).slice(0, 11);
  if (numeros.length <= 2) return numeros;
  const ddd = `(${numeros.slice(0, 2)}) `;
  const resto = numeros.slice(2);
  if (resto.length <= 4) return ddd + resto;
  const corte = resto.length > 8 ? 5 : 4;
  return `${ddd}${resto.slice(0, corte)}-${resto.slice(corte)}`;
};

/** "15.000,50" ou "15000,5" para centavos. Vazio vira zero. */
export const lerMoeda = (valor: string): number => {
  const limpo = valor.replace(/[^\d,]/g, '');
  if (!limpo) return 0;
  const [inteiro = '0', decimal = ''] = limpo.split(',');
  return Number(inteiro) * 100 + Number(decimal.padEnd(2, '0').slice(0, 2));
};

export const escreverMoeda = (centavos: number): string =>
  (centavos / 100).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

export const formatarMoeda = (centavos: number): string =>
  new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(centavos / 100);

/** Documento com máscara só quando está completo. */
export const formatarDocumento = (documento: string | null | undefined): string => {
  const numeros = digitos(documento ?? '');
  if (numeros.length !== 11 && numeros.length !== 14) return documento ?? '';
  return mascararDocumento(numeros);
};

export const formatarTelefone = (telefone: string | null | undefined): string => {
  const numeros = digitos(telefone ?? '');
  return numeros.length >= 10 ? mascararTelefone(numeros) : (telefone ?? '');
};

export const documentoCompleto = (valor: string): boolean => {
  const tamanho = digitos(valor).length;
  return tamanho === 11 || tamanho === 14;
};

/** 2026-09-13 para 13/09/2026, sem passar pelo construtor de Date — data pura
 *  vira o dia anterior em qualquer fuso a oeste. */
export const formatarData = (iso: string | null | undefined): string => {
  if (!iso) return '';
  const [ano, mes, dia] = iso.slice(0, 10).split('-');
  return ano && mes && dia ? `${dia}/${mes}/${ano}` : '';
};
