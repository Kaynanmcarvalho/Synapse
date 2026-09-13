/** Mascaras de digitacao. Guardamos so digitos; a mascara e so apresentacao. */

export const soDigitos = (valor: string): string => valor.replace(/\D/g, '');

/** Aplica o molde conforme o usuario digita: `0` e digito, o resto e literal. */
export const aplicarMascara = (valor: string, molde: string): string => {
  const digitos = soDigitos(valor);
  let saida = '';
  let indice = 0;
  for (const simbolo of molde) {
    if (indice >= digitos.length) break;
    if (simbolo === '0') {
      saida += digitos[indice];
      indice += 1;
    } else {
      saida += simbolo;
    }
  }
  return saida;
};

export const formatarCnpj = (valor: string) => aplicarMascara(valor, '00.000.000/0000-00');
export const formatarCpf = (valor: string) => aplicarMascara(valor, '000.000.000-00');
export const formatarCep = (valor: string) => aplicarMascara(valor, '00000-000');
export const formatarCfop = (valor: string) => aplicarMascara(valor, '0.000');
export const formatarCodigoIbge = (valor: string) => aplicarMascara(valor, '00-00000');

/** Ate 11 digitos e CPF; passou disso, CNPJ. */
export const formatarDocumento = (valor: string): string =>
  soDigitos(valor).length > 11 ? formatarCnpj(valor) : formatarCpf(valor);

export const formatarTelefone = (valor: string): string =>
  soDigitos(valor).length > 10
    ? aplicarMascara(valor, '(00) 00000-0000')
    : aplicarMascara(valor, '(00) 0000-0000');

/** Numero com virgula brasileira para campos de aliquota. */
export const lerDecimal = (valor: string): number => {
  const numero = Number(valor.replace(/\./g, '').replace(',', '.'));
  return Number.isFinite(numero) ? numero : 0;
};

export const formatarDecimal = (valor: number, casas = 4): string =>
  valor.toLocaleString('pt-BR', { minimumFractionDigits: casas, maximumFractionDigits: casas });

export const quando = (iso: string | null): string =>
  iso
    ? new Intl.DateTimeFormat('pt-BR', { dateStyle: 'short', timeStyle: 'short' }).format(
        new Date(iso),
      )
    : 'nunca';

export const lerInteiro = (valor: string): number => {
  const digitos = soDigitos(valor);
  return digitos ? Number(digitos) : 0;
};
