import { BadRequestException } from '@nestjs/common';
import type { UserId } from '@synapse/types';
import type { ItemDaNota, NotaRecebida } from './nfe-xml';

/** As quatro manifestacoes do destinatario (§17). */
export const MANIFESTACOES = [
  'CIENCIA_DA_OPERACAO',
  'CONFIRMACAO_DA_OPERACAO',
  'DESCONHECIMENTO_DA_OPERACAO',
  'OPERACAO_NAO_REALIZADA',
] as const;

export type Manifestacao = (typeof MANIFESTACOES)[number];

/** Duas delas negam a operacao perante a SEFAZ e exigem justificativa. */
const EXIGEM_JUSTIFICATIVA: readonly Manifestacao[] = [
  'DESCONHECIMENTO_DA_OPERACAO',
  'OPERACAO_NAO_REALIZADA',
];

export interface PedidoDeManifestacao {
  readonly chaveDeAcesso: string;
  readonly manifestacao: Manifestacao;
  readonly justificativa: string | null;
  readonly por: UserId;
}

export const validarManifestacao = (pedido: PedidoDeManifestacao): void => {
  if (!EXIGEM_JUSTIFICATIVA.includes(pedido.manifestacao)) return;

  const justificativa = pedido.justificativa?.trim() ?? '';
  // 15 caracteres e o minimo da SEFAZ; recusar aqui evita a viagem ate a
  // rejeicao e o usuario descobrir o motivo num codigo numerico.
  if (justificativa.length < 15) {
    throw new BadRequestException(
      `${pedido.manifestacao} exige justificativa de ao menos 15 caracteres`,
    );
  }
};

export type SituacaoDaConferencia = 'PENDENTE' | 'CONFERIDA' | 'RECUSADA' | 'LANCADA';

/** A ligacao entre o produto do fornecedor e o nosso (c20-4).
 *
 *  Fica guardada por (cnpj do emitente + codigo dele): na proxima nota do mesmo
 *  fornecedor o de-para ja vem resolvido, e o conferente so olha o que mudou. */
export interface DeParaDoFornecedor {
  readonly cnpjEmitente: string;
  readonly codigoDoFornecedor: string;
  readonly productId: string;
  /** Quantos do NOSSO produto cabem em uma unidade do fornecedor. Fardo com 4
   *  pacotes chega como 1 e entra como 4 — sem isso o estoque entra errado. */
  readonly fatorDeConversao: number;
}

export interface ItemConferido {
  readonly numero: number;
  readonly productId: string | null;
  readonly quantidadeMilesimos: number;
  readonly custoUnitarioCentavos: number;
  readonly lote: string | null;
  readonly validade: string | null;
  readonly conferido: boolean;
  readonly observacao: string | null;
}

export interface Conferencia {
  readonly chaveDeAcesso: string;
  readonly situacao: SituacaoDaConferencia;
  readonly itens: readonly ItemConferido[];
  readonly conferidaPor: UserId | null;
  readonly conferidaEm: string | null;
}

const chaveDoDePara = (cnpj: string, codigo: string) => `${cnpj}:${codigo}`;

/** Monta a conferencia a partir do XML, ja resolvendo o de-para conhecido.
 *
 *  Item sem de-para vem com productId nulo e conferido falso: e exatamente o
 *  que o conferente precisa ver primeiro. */
export const prepararConferencia = (
  nota: NotaRecebida,
  deParas: readonly DeParaDoFornecedor[],
): Conferencia => {
  const conhecidos = new Map(
    deParas
      .filter((d) => d.cnpjEmitente === nota.emitente.cnpj)
      .map((d) => [chaveDoDePara(d.cnpjEmitente, d.codigoDoFornecedor), d]),
  );

  return {
    chaveDeAcesso: nota.chaveDeAcesso,
    situacao: 'PENDENTE',
    conferidaPor: null,
    conferidaEm: null,
    itens: nota.itens.map((item) =>
      converter(item, conhecidos.get(chaveDoDePara(nota.emitente.cnpj, item.codigoDoFornecedor))),
    ),
  };
};

const converter = (item: ItemDaNota, dePara: DeParaDoFornecedor | undefined): ItemConferido => {
  if (!dePara) {
    return {
      numero: item.numero,
      productId: null,
      quantidadeMilesimos: item.quantidadeMilesimos,
      custoUnitarioCentavos: item.valorUnitarioCentavos,
      lote: item.lote,
      validade: item.validade,
      conferido: false,
      observacao: 'Produto do fornecedor ainda não vinculado a um produto interno',
    };
  }

  const quantidade = item.quantidadeMilesimos * dePara.fatorDeConversao;
  return {
    numero: item.numero,
    productId: dePara.productId,
    // O custo unitario acompanha a conversao: o total pago nao muda, entao o
    // custo por unidade nossa e o do fornecedor dividido pelo fator.
    quantidadeMilesimos: quantidade,
    custoUnitarioCentavos: Math.round(item.valorUnitarioCentavos / dePara.fatorDeConversao),
    lote: item.lote,
    validade: item.validade,
    conferido: false,
    observacao: null,
  };
};

export const marcarItemConferido = (
  conferencia: Conferencia,
  numero: number,
  ajuste: Partial<
    Pick<
      ItemConferido,
      'productId' | 'quantidadeMilesimos' | 'custoUnitarioCentavos' | 'lote' | 'validade'
    >
  >,
): Conferencia => {
  if (conferencia.situacao === 'LANCADA') {
    throw new BadRequestException('Conferência já lançada no estoque não pode ser alterada');
  }
  if (!conferencia.itens.some((item) => item.numero === numero)) {
    throw new BadRequestException(`Item ${numero} não existe nesta nota`);
  }

  return {
    ...conferencia,
    itens: conferencia.itens.map((item) =>
      item.numero === numero ? { ...item, ...ajuste, conferido: true, observacao: null } : item,
    ),
  };
};

export const itensPendentes = (conferencia: Conferencia): readonly ItemConferido[] =>
  conferencia.itens.filter((item) => !item.conferido || !item.productId);

/** c20-3 e a regra que o cartao poe em negrito: a entrada so acontece **apos
 *  conferencia humana**.
 *
 *  Importar XML direto ao estoque parece economizar trabalho, mas a divergencia
 *  que isso gera aparece semanas depois, no inventario, sem ninguem conseguir
 *  dizer de onde veio. Recusar aqui e mais barato. */
export const concluirConferencia = (
  conferencia: Conferencia,
  por: UserId,
  agora: string,
): Conferencia => {
  if (conferencia.situacao === 'LANCADA') {
    throw new BadRequestException('Conferência já lançada');
  }

  const pendentes = itensPendentes(conferencia);
  if (pendentes.length > 0) {
    throw new BadRequestException(
      `Faltam conferir ${pendentes.length} item(ns): ${pendentes.map((i) => i.numero).join(', ')}`,
    );
  }

  return { ...conferencia, situacao: 'CONFERIDA', conferidaPor: por, conferidaEm: agora };
};

export const lancarNoEstoque = (conferencia: Conferencia): Conferencia => {
  if (conferencia.situacao !== 'CONFERIDA') {
    throw new BadRequestException(
      'A entrada só acontece após a conferência humana: conclua a conferência primeiro',
    );
  }
  return { ...conferencia, situacao: 'LANCADA' };
};
