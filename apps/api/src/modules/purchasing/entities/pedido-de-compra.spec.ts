import { BadRequestException } from '@nestjs/common';
import type { PurchaseOrder, SupplierQuote } from '@synapse/types';
import {
  adicionarCotacao,
  calcularDivergencias,
  criarRascunho,
  custoMedioApos,
  registrarRecebimento,
  selecionarFornecedor,
  totalDaCotacao,
} from './pedido-de-compra';

const tenantId = 'tenant-1' as PurchaseOrder['tenantId'];
const branchId = 'matriz' as PurchaseOrder['branchId'];
const userId = 'user-1' as PurchaseOrder['createdBy'];
const productA = 'product-a' as PurchaseOrder['items'][number]['productId'];
const productB = 'product-b' as PurchaseOrder['items'][number]['productId'];

const draft = () =>
  criarRascunho({
    tenantId,
    branchId,
    warehouseId: 'wh',
    items: [
      { productId: productA, quantityOrdered: 10 },
      { productId: productB, quantityOrdered: 5 },
    ],
    sourceSuggestionIds: [],
    createdBy: userId,
    now: '2026-04-01T00:00:00.000Z',
  });

const quoteFrom = (supplierId: string, priceA: number, priceB: number): SupplierQuote => ({
  supplierId: supplierId as SupplierQuote['supplierId'],
  leadDays: 5,
  items: [
    { productId: productA, unitCostCentavos: priceA },
    { productId: productB, unitCostCentavos: priceB },
  ],
  submittedAt: '2026-04-01T00:00:00.000Z',
  submittedBy: userId,
});

describe('criarRascunho', () => {
  it('recusa pedido sem itens', () => {
    expect(() =>
      criarRascunho({
        tenantId,
        branchId,
        warehouseId: 'wh',
        items: [],
        sourceSuggestionIds: [],
        createdBy: userId,
        now: '2026-04-01T00:00:00.000Z',
      }),
    ).toThrow(BadRequestException);
  });

  it('recusa quantidade zero ou negativa', () => {
    expect(() =>
      criarRascunho({
        tenantId,
        branchId,
        warehouseId: 'wh',
        items: [{ productId: productA, quantityOrdered: 0 }],
        sourceSuggestionIds: [],
        createdBy: userId,
        now: '2026-04-01T00:00:00.000Z',
      }),
    ).toThrow(BadRequestException);
  });

  it('começa em RASCUNHO, sem fornecedor e sem custo', () => {
    const pedido = draft();
    expect(pedido.status).toBe('RASCUNHO');
    expect(pedido.supplierId).toBeNull();
    expect(pedido.items.every((item) => item.unitCostCentavos === 0)).toBe(true);
  });
});

describe('adicionarCotacao', () => {
  it('move o pedido para EM_COTACAO e guarda a cotação', () => {
    const pedido = adicionarCotacao(draft(), quoteFrom('fornecedor-1', 1000, 2000));
    expect(pedido.status).toBe('EM_COTACAO');
    expect(pedido.quotes).toHaveLength(1);
  });

  it('recusa cotação que não cobre todos os itens do pedido', () => {
    const incompleta: SupplierQuote = {
      supplierId: 'fornecedor-1' as SupplierQuote['supplierId'],
      leadDays: 5,
      items: [{ productId: productA, unitCostCentavos: 1000 }],
      submittedAt: '2026-04-01T00:00:00.000Z',
      submittedBy: userId,
    };
    expect(() => adicionarCotacao(draft(), incompleta)).toThrow(BadRequestException);
  });

  it('substitui a cotação anterior do mesmo fornecedor em vez de duplicar', () => {
    let pedido = adicionarCotacao(draft(), quoteFrom('fornecedor-1', 1000, 2000));
    pedido = adicionarCotacao(pedido, quoteFrom('fornecedor-1', 900, 1800));
    expect(pedido.quotes).toHaveLength(1);
    expect(pedido.quotes[0]?.items[0]?.unitCostCentavos).toBe(900);
  });

  it('recusa nova cotação depois que o pedido já foi aprovado', () => {
    let pedido = adicionarCotacao(draft(), quoteFrom('fornecedor-1', 1000, 2000));
    pedido = adicionarCotacao(pedido, quoteFrom('fornecedor-2', 1100, 2100));
    pedido = selecionarFornecedor(
      pedido,
      'fornecedor-1' as never,
      userId,
      '2026-04-02T00:00:00.000Z',
    );
    expect(() => adicionarCotacao(pedido, quoteFrom('fornecedor-3', 900, 1900))).toThrow(
      BadRequestException,
    );
  });
});

describe('totalDaCotacao', () => {
  it('soma preço unitário x quantidade pedida de cada item', () => {
    const pedido = draft();
    const total = totalDaCotacao(quoteFrom('fornecedor-1', 1000, 2000), pedido);
    // 10*1000 + 5*2000 = 20000
    expect(total).toBe(20_000);
  });
});

describe('selecionarFornecedor', () => {
  it('exige ao menos duas cotações antes de aprovar', () => {
    const pedido = adicionarCotacao(draft(), quoteFrom('fornecedor-1', 1000, 2000));
    expect(() =>
      selecionarFornecedor(pedido, 'fornecedor-1' as never, userId, '2026-04-02T00:00:00.000Z'),
    ).toThrow(BadRequestException);
  });

  it('aprova com a cotação vencedora, copiando os preços para os itens', () => {
    let pedido = adicionarCotacao(draft(), quoteFrom('fornecedor-1', 1000, 2000));
    pedido = adicionarCotacao(pedido, quoteFrom('fornecedor-2', 900, 1900));
    const aprovado = selecionarFornecedor(
      pedido,
      'fornecedor-2' as never,
      userId,
      '2026-04-02T00:00:00.000Z',
    );
    expect(aprovado.status).toBe('APROVADO');
    expect(aprovado.supplierId).toBe('fornecedor-2');
    expect(aprovado.items.find((item) => item.productId === productA)?.unitCostCentavos).toBe(900);
  });
});

describe('calcularDivergencias', () => {
  const aprovado = () => {
    let pedido = adicionarCotacao(draft(), quoteFrom('fornecedor-1', 1000, 2000));
    pedido = adicionarCotacao(pedido, quoteFrom('fornecedor-2', 900, 1900));
    return selecionarFornecedor(
      pedido,
      'fornecedor-2' as never,
      userId,
      '2026-04-02T00:00:00.000Z',
    );
  };

  it('calcula divergência zero quando recebeu exatamente o pedido', () => {
    const linhas = calcularDivergencias(aprovado(), [
      { productId: productA, quantityReceived: 10, unitCostReceived: 900 },
      { productId: productB, quantityReceived: 5, unitCostReceived: 1900 },
    ]);
    expect(
      linhas.every((linha) => linha.quantityDivergence === 0 && linha.costDivergence === 0),
    ).toBe(true);
  });

  it('detecta divergência de quantidade e de custo', () => {
    const linhas = calcularDivergencias(aprovado(), [
      { productId: productA, quantityReceived: 8, unitCostReceived: 950 },
    ]);
    const linhaA = linhas.find((linha) => linha.productId === productA);
    expect(linhaA?.quantityDivergence).toBe(-2); // 8 - 10
    expect(linhaA?.costDivergence).toBe((950 - 900) * 8); // 400
    const linhaB = linhas.find((linha) => linha.productId === productB);
    expect(linhaB?.quantityReceived).toBe(0); // não veio nesta remessa
  });
});

describe('registrarRecebimento', () => {
  const aprovado = () => {
    let pedido = adicionarCotacao(draft(), quoteFrom('fornecedor-1', 1000, 2000));
    pedido = adicionarCotacao(pedido, quoteFrom('fornecedor-2', 900, 1900));
    return selecionarFornecedor(
      pedido,
      'fornecedor-2' as never,
      userId,
      '2026-04-02T00:00:00.000Z',
    );
  };

  it('fica RECEBIDO_PARCIAL quando falta item', () => {
    const pedido = aprovado();
    const linhas = calcularDivergencias(pedido, [
      { productId: productA, quantityReceived: 10, unitCostReceived: 900 },
    ]);
    const recebido = registrarRecebimento(pedido, linhas);
    expect(recebido.status).toBe('RECEBIDO_PARCIAL');
  });

  it('fica RECEBIDO quando tudo chegou, mesmo em duas remessas', () => {
    let pedido = aprovado();
    const primeira = calcularDivergencias(pedido, [
      { productId: productA, quantityReceived: 10, unitCostReceived: 900 },
    ]);
    pedido = registrarRecebimento(pedido, primeira);
    expect(pedido.status).toBe('RECEBIDO_PARCIAL');

    const segunda = calcularDivergencias(pedido, [
      { productId: productB, quantityReceived: 5, unitCostReceived: 1900 },
    ]);
    pedido = registrarRecebimento(pedido, segunda);
    expect(pedido.status).toBe('RECEBIDO');
    expect(pedido.items.find((item) => item.productId === productA)?.quantityReceived).toBe(10);
  });

  it('recusa receber um pedido que ainda não foi aprovado', () => {
    expect(() => registrarRecebimento(draft(), [])).toThrow(BadRequestException);
  });
});

describe('custoMedioApos', () => {
  it('pondera o estoque existente com a quantidade recebida', () => {
    // 100 un a R$10,00 (1000 centavos) + 50 un a R$16,00 (1600 centavos)
    // = (100*1000 + 50*1600) / 150 = 1200
    expect(custoMedioApos(100, 1000, 50, 1600)).toBe(1200);
  });

  it('adota o custo da compra quando não havia estoque', () => {
    expect(custoMedioApos(0, 0, 20, 750)).toBe(750);
  });

  it('mantém o custo médio atual quando não recebeu nada', () => {
    expect(custoMedioApos(10, 500, 0, 999)).toBe(500);
  });
});
