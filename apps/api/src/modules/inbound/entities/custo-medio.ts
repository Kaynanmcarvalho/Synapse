import { BadRequestException } from '@nestjs/common';

/** Atualizacao de custo e custo medio na entrada (c20-6, §40). */

export interface PosicaoDeCusto {
  /** Saldo em milesimos. */
  readonly quantidadeMilesimos: number;
  readonly custoMedioCentavos: number;
  readonly ultimoCustoCentavos: number;
}

/** Custo medio ponderado pela quantidade.
 *
 *  Media simples entre o custo antigo e o novo estaria errada sempre que as
 *  quantidades diferem: 1 unidade a R$ 10 e 99 a R$ 20 nao dao R$ 15. O peso e
 *  a quantidade, e a conta e feita em centavos inteiros.
 *
 *  O arredondamento e da divisao final, uma vez so: arredondar antes acumularia
 *  erro a cada entrada, e o custo medio derivaria com o tempo. */
export const aplicarEntrada = (
  atual: PosicaoDeCusto,
  quantidadeMilesimos: number,
  custoUnitarioCentavos: number,
): PosicaoDeCusto => {
  if (quantidadeMilesimos <= 0) {
    throw new BadRequestException('Quantidade de entrada deve ser positiva');
  }
  if (custoUnitarioCentavos < 0) {
    throw new BadRequestException('Custo unitário não pode ser negativo');
  }

  const saldoAnterior = Math.max(0, atual.quantidadeMilesimos);
  const novoSaldo = saldoAnterior + quantidadeMilesimos;

  // Estoque zerado (ou negativo, por acerto pendente): o custo passa a ser o da
  // entrada. Ponderar contra um saldo que nao existe daria peso a um custo que
  // nao tem mais mercadoria por tras.
  if (saldoAnterior === 0) {
    return {
      quantidadeMilesimos: novoSaldo,
      custoMedioCentavos: custoUnitarioCentavos,
      ultimoCustoCentavos: custoUnitarioCentavos,
    };
  }

  const valorAnterior = saldoAnterior * atual.custoMedioCentavos;
  const valorEntrada = quantidadeMilesimos * custoUnitarioCentavos;

  return {
    quantidadeMilesimos: novoSaldo,
    custoMedioCentavos: Math.round((valorAnterior + valorEntrada) / novoSaldo),
    ultimoCustoCentavos: custoUnitarioCentavos,
  };
};

export interface ParcelaDaNota {
  readonly numero: number;
  readonly vencimento: string;
  readonly valorCentavos: number;
}

/** Contas a pagar geradas da nota (c20-7).
 *
 *  Sem duplicatas no XML, vira parcela unica no vencimento informado — melhor
 *  do que nao gerar nada e alguem descobrir a conta no dia do vencimento. */
export const parcelasDaNota = (
  duplicatas: readonly { readonly vencimento: string; readonly valorCentavos: number }[],
  totalCentavos: number,
  vencimentoPadrao: string,
): readonly ParcelaDaNota[] => {
  if (duplicatas.length === 0) {
    return [{ numero: 1, vencimento: vencimentoPadrao, valorCentavos: totalCentavos }];
  }

  const somaDasDuplicatas = duplicatas.reduce((soma, d) => soma + d.valorCentavos, 0);
  if (somaDasDuplicatas !== totalCentavos) {
    throw new BadRequestException(
      `Duplicatas somam ${somaDasDuplicatas} e a nota tem ${totalCentavos} centavos`,
    );
  }

  return duplicatas.map((duplicata, indice) => ({
    numero: indice + 1,
    vencimento: duplicata.vencimento,
    valorCentavos: duplicata.valorCentavos,
  }));
};
