import type { CarteiraDoCliente } from '@synapse/types';

/** Regua de comparacao das parcelas simuladas: o que o cliente costuma pagar
 *  por parcela e o que ja deve por parcela. So leitura — o valor de cada
 *  parcela vem das regras compartilhadas, as mesmas da API. */

const media = (valores: readonly number[]): number | null =>
  valores.length === 0 ? null : Math.round(valores.reduce((a, b) => a + b, 0) / valores.length);

export const referenciasDoCliente = (carteira: CarteiraDoCliente) => ({
  mediaPagaCentavos: media(carteira.pagamentos.map((pagamento) => pagamento.valorCentavos)),
  mediaEmAbertoCentavos: media(carteira.titulosEmAberto.map((titulo) => titulo.saldoCentavos)),
});

/** Quanto a parcela passa (ou fica abaixo) da media, em pontos percentuais. */
export const diferencaParaMedia = (valorCentavos: number, mediaCentavos: number | null) =>
  mediaCentavos === null || mediaCentavos === 0
    ? null
    : Math.round(((valorCentavos - mediaCentavos) / mediaCentavos) * 100);
