import type { CashSession } from '@synapse/types';

/** De onde vem o dinheiro que o caixa espera na gaveta: fundo de troco,
 *  suprimentos, sangrias e o que as vendas em dinheiro deixaram. */
export const resumoDoCaixa = (caixa: CashSession) => {
  const soma = (tipo: CashSession['movements'][number]['type']) =>
    caixa.movements
      .filter((movimento) => movimento.type === tipo)
      .reduce((total, movimento) => total + movimento.amount, 0);
  const suprimentos = soma('SUPPLY');
  const sangrias = soma('WITHDRAWAL');
  return {
    abertura: caixa.openingAmount,
    suprimentos,
    sangrias,
    vendasEmDinheiro: caixa.expectedCash - caixa.openingAmount - suprimentos + sangrias,
    esperado: caixa.expectedCash,
  };
};
