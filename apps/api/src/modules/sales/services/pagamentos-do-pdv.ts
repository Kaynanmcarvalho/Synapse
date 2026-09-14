import { BadRequestException } from '@nestjs/common';
import type { MeioDePagamento, PaymentMethod, PosPayment } from '@synapse/types';

/** Como cada forma de pagamento da tabela vai para o caixa e para a NFC-e. */
export const METODO_DO_MEIO: Readonly<Record<MeioDePagamento, PaymentMethod>> = {
  DINHEIRO: 'CASH',
  PIX: 'PIX',
  CARTAO_DEBITO: 'DEBIT_CARD',
  CARTAO_CREDITO: 'CREDIT_CARD',
  BOLETO: 'BOLETO',
  A_PRAZO: 'ON_ACCOUNT',
  CHEQUE: 'WALLET',
  BONIFICACAO: 'WALLET',
  OUTROS: 'WALLET',
};

export interface FechamentoDoPagamento {
  /** Os pagamentos como ficam na venda: o dinheiro já sem o troco. */
  readonly pagamentos: readonly PosPayment[];
  readonly trocoCentavos: number;
  /** O que entra na gaveta de verdade. */
  readonly dinheiroNaGaveta: number;
}

/** Confere o pagamento contra o total da venda. Pagamento a menos é recusado;
 *  a mais só vira troco se houver dinheiro para devolver — cartão e PIX não
 *  dão troco. */
export const fecharPagamento = (
  totalCentavos: number,
  pagamentos: readonly PosPayment[],
): FechamentoDoPagamento => {
  const soma = pagamentos.reduce((total, pagamento) => total + pagamento.amount, 0);
  if (soma < totalCentavos)
    throw new BadRequestException(
      `Faltam ${((totalCentavos - soma) / 100).toFixed(2).replace('.', ',')} para fechar a venda`,
    );
  const dinheiro = pagamentos
    .filter((pagamento) => pagamento.method === 'CASH')
    .reduce((total, pagamento) => total + pagamento.amount, 0);
  const troco = soma - totalCentavos;
  if (troco > dinheiro)
    throw new BadRequestException('Só pagamento em dinheiro dá troco: confira os valores');
  let aDescontar = troco;
  const ajustados = pagamentos
    .map((pagamento) => {
      if (pagamento.method !== 'CASH' || aDescontar === 0) return pagamento;
      const desconto = Math.min(aDescontar, pagamento.amount);
      aDescontar -= desconto;
      return { ...pagamento, amount: pagamento.amount - desconto };
    })
    .filter((pagamento) => pagamento.amount > 0);
  return { pagamentos: ajustados, trocoCentavos: troco, dinheiroNaGaveta: dinheiro - troco };
};
