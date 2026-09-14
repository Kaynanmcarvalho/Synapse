import type { ItemDeTabela } from '@synapse/types';

/** Os pagamentos lançados na Finalizar Venda e a conta de falta e troco — a
 *  mesma que a API refaz ao concluir. */

export interface PagamentoLancado {
  readonly forma: ItemDeTabela;
  readonly valorCentavos: number;
}

export interface ResumoDoPagamento {
  readonly totalCentavos: number;
  readonly pagoCentavos: number;
  readonly faltaCentavos: number;
  readonly trocoCentavos: number;
}

export const resumirPagamento = (
  totalCentavos: number,
  pagamentos: readonly PagamentoLancado[],
): ResumoDoPagamento => {
  const pagoCentavos = pagamentos.reduce((soma, pagamento) => soma + pagamento.valorCentavos, 0);
  return {
    totalCentavos,
    pagoCentavos,
    faltaCentavos: Math.max(0, totalCentavos - pagoCentavos),
    trocoCentavos: Math.max(0, pagoCentavos - totalCentavos),
  };
};

/** CPF (11) ou CNPJ (14) só com dígitos vai para a NFC-e; o resto fica fora. */
export const documentoDaNota = (documento: string | null): string | null =>
  documento && /^(\d{11}|\d{14})$/.test(documento) ? documento : null;
