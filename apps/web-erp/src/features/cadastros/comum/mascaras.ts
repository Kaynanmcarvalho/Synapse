/** "08:00" enquanto se digita. */
export const mascararHora = (valor: string): string => {
  const numeros = valor.replace(/\D/g, '').slice(0, 6);
  return numeros.replace(/^(\d{2})(\d)/, '$1:$2').replace(/^(\d{2}):(\d{2})(\d)/, '$1:$2:$3');
};

export const soDigitos = (limite: number) => (valor: string) =>
  valor.replace(/\D/g, '').slice(0, limite);

/** "1.500,00" ou "2,5": só números, ponto e uma vírgula. */
export const mascararValor = (valor: string): string => {
  const limpo = valor.replace(/[^\d.,]/g, '');
  const [inteiro = '', ...decimais] = limpo.split(',');
  return decimais.length ? `${inteiro},${decimais.join('').slice(0, 2)}` : inteiro;
};
