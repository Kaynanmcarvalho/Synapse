/** Etiqueta de balança (EAN-13 começando com 2): `2 CCCCC VVVVV D` — código
 *  do produto em 5 dígitos, peso em gramas ou valor em centavos em 5 dígitos
 *  e o dígito verificador. O que os 5 últimos trazem é configuração da balança. */

export type ConteudoDaEtiqueta = 'peso' | 'valor';

export interface EtiquetaDeBalanca {
  readonly codigoDoProduto: string;
  readonly numero: number;
}

const CHAVE = 'synapse:pdv:etiqueta';

const digitoVerificador = (doze: string): number => {
  const soma = [...doze].reduce(
    (total, digito, indice) => total + Number(digito) * (indice % 2 === 0 ? 1 : 3),
    0,
  );
  return (10 - (soma % 10)) % 10;
};

export const lerEtiquetaDeBalanca = (codigo: string): EtiquetaDeBalanca | null => {
  const limpo = codigo.trim();
  if (!/^2\d{12}$/.test(limpo)) return null;
  if (digitoVerificador(limpo.slice(0, 12)) !== Number(limpo[12])) return null;
  return { codigoDoProduto: limpo.slice(1, 6), numero: Number(limpo.slice(6, 11)) };
};

/** Quantidade em milésimos: o peso em gramas já é o milésimo do quilo; o valor
 *  divide pelo preço do quilo. */
export const quantidadeDaEtiqueta = (
  etiqueta: EtiquetaDeBalanca,
  conteudo: ConteudoDaEtiqueta,
  precoCentavos: number,
): number | null => {
  if (conteudo === 'peso') return etiqueta.numero > 0 ? etiqueta.numero : null;
  if (precoCentavos <= 0) return null;
  const milesimos = Math.round((etiqueta.numero * 1000) / precoCentavos);
  return milesimos > 0 ? milesimos : null;
};

export const conteudoDaEtiqueta = (): ConteudoDaEtiqueta => {
  try {
    return window.localStorage.getItem(CHAVE) === 'valor' ? 'valor' : 'peso';
  } catch {
    return 'peso';
  }
};

export const guardarConteudoDaEtiqueta = (conteudo: ConteudoDaEtiqueta): void => {
  try {
    window.localStorage.setItem(CHAVE, conteudo);
  } catch {
    // Sem armazenamento a escolha vale só nesta tela.
  }
};
