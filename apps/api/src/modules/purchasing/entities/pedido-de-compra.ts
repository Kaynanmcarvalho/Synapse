import { BadRequestException } from '@nestjs/common';
import type {
  BranchId,
  PurchaseOrder,
  PurchaseOrderItem,
  ReceivingLine,
  SupplierId,
  SupplierQuote,
  TenantId,
  UserId,
} from '@synapse/types';
import { randomUUID } from 'node:crypto';

export interface DraftItemInput {
  readonly productId: PurchaseOrderItem['productId'];
  readonly quantityOrdered: number;
}

/** Rascunho novo, sem cotação e sem fornecedor definido — o ponto de partida
 *  tanto de "gerar pedido a partir da sugestão" quanto de um pedido manual;
 *  os dois convergem aqui, só muda quem preenche `sourceSuggestionIds`. */
export const criarRascunho = (input: {
  readonly tenantId: TenantId;
  readonly branchId: BranchId;
  readonly warehouseId: string;
  readonly items: readonly DraftItemInput[];
  readonly sourceSuggestionIds: readonly string[];
  readonly createdBy: UserId;
  readonly now: string;
}): PurchaseOrder => {
  if (input.items.length === 0) {
    throw new BadRequestException('Pedido de compra precisa de ao menos um item');
  }
  if (input.items.some((item) => item.quantityOrdered <= 0)) {
    throw new BadRequestException('Toda quantidade pedida precisa ser positiva');
  }

  return {
    id: randomUUID(),
    tenantId: input.tenantId,
    branchId: input.branchId,
    warehouseId: input.warehouseId,
    status: 'RASCUNHO',
    supplierId: null,
    items: input.items.map((item) => ({ ...item, unitCostCentavos: 0, quantityReceived: 0 })),
    quotes: [],
    sourceSuggestionIds: input.sourceSuggestionIds,
    version: 1,
    createdAt: input.now,
    createdBy: input.createdBy,
    approvedAt: null,
    approvedBy: null,
  };
};

/** Anexa (ou substitui) a cotação de um fornecedor. Fica em EM_COTACAO
 *  enquanto recebe cotações — só sai daí quando uma é selecionada. */
export const adicionarCotacao = (pedido: PurchaseOrder, cotacao: SupplierQuote): PurchaseOrder => {
  if (pedido.status !== 'RASCUNHO' && pedido.status !== 'EM_COTACAO') {
    throw new BadRequestException(`Pedido em status ${pedido.status} não aceita nova cotação`);
  }
  const itemIds = new Set(pedido.items.map((item) => item.productId));
  const cobreTodosOsItens = pedido.items.every((item) =>
    cotacao.items.some((quoteItem) => quoteItem.productId === item.productId),
  );
  if (!cobreTodosOsItens) {
    throw new BadRequestException('A cotação precisa cobrir todos os itens do pedido');
  }
  if (cotacao.items.some((quoteItem) => !itemIds.has(quoteItem.productId))) {
    throw new BadRequestException('A cotação tem um item que não está no pedido');
  }

  const semEsseFornecedor = pedido.quotes.filter(
    (quote) => quote.supplierId !== cotacao.supplierId,
  );
  return {
    ...pedido,
    status: 'EM_COTACAO',
    quotes: [...semEsseFornecedor, cotacao],
    version: pedido.version + 1,
  };
};

/** Total de uma cotação, para ranquear fornecedores na tela de comparação. */
export const totalDaCotacao = (cotacao: SupplierQuote, pedido: PurchaseOrder): number =>
  pedido.items.reduce((soma, item) => {
    const quoteItem = cotacao.items.find((candidate) => candidate.productId === item.productId);
    return soma + (quoteItem?.unitCostCentavos ?? 0) * item.quantityOrdered;
  }, 0);

/** §40 "cotação com mais de um fornecedor": aprovar exige ter comparado pelo
 *  menos duas — aprovar com uma só não é cotação, é aceitar o primeiro preço. */
export const selecionarFornecedor = (
  pedido: PurchaseOrder,
  supplierId: SupplierId,
  aprovadoPor: UserId,
  agora: string,
): PurchaseOrder => {
  if (pedido.status !== 'EM_COTACAO') {
    throw new BadRequestException('Só é possível aprovar um pedido em cotação');
  }
  if (pedido.quotes.length < 2) {
    throw new BadRequestException(
      'É preciso comparar ao menos duas cotações antes de aprovar o pedido',
    );
  }
  const vencedora = pedido.quotes.find((quote) => quote.supplierId === supplierId);
  if (!vencedora) throw new BadRequestException('Cotação do fornecedor selecionado não existe');

  const items = pedido.items.map((item) => {
    const quoteItem = vencedora.items.find((candidate) => candidate.productId === item.productId);
    return { ...item, unitCostCentavos: quoteItem?.unitCostCentavos ?? 0 };
  });

  return {
    ...pedido,
    status: 'APROVADO',
    supplierId,
    items,
    approvedAt: agora,
    approvedBy: aprovadoPor,
    version: pedido.version + 1,
  };
};

export interface LinhaRecebidaInput {
  readonly productId: PurchaseOrderItem['productId'];
  readonly quantityReceived: number;
  readonly unitCostReceived: number;
}

/** Confere pedido x nota (§40): para cada item pedido, calcula a divergência
 *  de quantidade e de custo contra o que efetivamente chegou. Item pedido
 *  que não veio nesta remessa aparece com quantityReceived = 0 — pedidos
 *  parciais são o caso normal, não um erro. */
export const calcularDivergencias = (
  pedido: PurchaseOrder,
  linhasRecebidas: readonly LinhaRecebidaInput[],
): readonly ReceivingLine[] =>
  pedido.items.map((item) => {
    const recebida = linhasRecebidas.find((linha) => linha.productId === item.productId);
    const quantityReceived = recebida?.quantityReceived ?? 0;
    const unitCostReceived = recebida?.unitCostReceived ?? item.unitCostCentavos;
    return {
      productId: item.productId,
      quantityOrdered: item.quantityOrdered,
      quantityReceived,
      unitCostOrdered: item.unitCostCentavos,
      unitCostReceived,
      quantityDivergence: quantityReceived - item.quantityOrdered,
      costDivergence: Math.round((unitCostReceived - item.unitCostCentavos) * quantityReceived),
    };
  });

/** Aplica o recebimento no pedido: soma o que chegou ao já recebido antes
 *  (um pedido pode ser recebido em mais de uma remessa) e decide se fechou
 *  ou ficou parcial. */
export const registrarRecebimento = (
  pedido: PurchaseOrder,
  linhas: readonly ReceivingLine[],
): PurchaseOrder => {
  if (pedido.status !== 'APROVADO' && pedido.status !== 'RECEBIDO_PARCIAL') {
    throw new BadRequestException('Só é possível receber um pedido aprovado');
  }

  const items = pedido.items.map((item) => {
    const linha = linhas.find((candidate) => candidate.productId === item.productId);
    return {
      ...item,
      quantityReceived: item.quantityReceived + (linha?.quantityReceived ?? 0),
    };
  });
  const completo = items.every((item) => item.quantityReceived >= item.quantityOrdered);

  return {
    ...pedido,
    items,
    status: completo ? 'RECEBIDO' : 'RECEBIDO_PARCIAL',
    version: pedido.version + 1,
  };
};

/** Custo médio ponderado (§40 "atualização de custo e custo médio"): o novo
 *  custo médio pesa o estoque que já existia com o que acabou de chegar.
 *  Estoque zerado (produto novo) simplesmente adota o custo da compra. */
export const custoMedioApos = (
  estoqueAtual: number,
  custoMedioAtualCentavos: number,
  quantidadeRecebida: number,
  custoUnitarioRecebidoCentavos: number,
): number => {
  const totalAnterior = Math.max(estoqueAtual, 0) * custoMedioAtualCentavos;
  const totalRecebido = quantidadeRecebida * custoUnitarioRecebidoCentavos;
  const quantidadeTotal = Math.max(estoqueAtual, 0) + quantidadeRecebida;
  if (quantidadeTotal <= 0) return custoMedioAtualCentavos;
  return Math.round((totalAnterior + totalRecebido) / quantidadeTotal);
};
