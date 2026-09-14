import { BadRequestException, ConflictException } from '@nestjs/common';
import {
  CONTEXTO_DO_CAIXA as contexto,
  montarPdv,
  produtoDeTeste,
  vendedorDeTeste,
} from '../../../../test/pdv-de-teste';

const semNfce = { issueNfce: async () => 'nao-deveria-emitir' };

describe('PosService — o caixa', () => {
  it('abre, recusa segundo caixa na mesma filial, movimenta e fecha com diferença', async () => {
    const { caixas } = montarPdv();
    expect(await caixas.getCurrentSession(contexto, 'matriz')).toBeNull();
    const caixa = await caixas.openCash(contexto, 'matriz', 10_000);
    await expect(caixas.openCash(contexto, 'matriz', 0)).rejects.toBeInstanceOf(ConflictException);
    expect((await caixas.getCurrentSession(contexto, 'matriz'))?.id).toBe(caixa.id);
    expect(await caixas.getCurrentSession(contexto, 'outra-filial')).toBeNull();

    await caixas.addMovement(contexto, caixa.id, 'SUPPLY', {
      amount: 5_000,
      reason: 'Troco do dia',
    });
    await expect(
      caixas.addMovement(contexto, caixa.id, 'WITHDRAWAL', {
        amount: 50_000,
        reason: 'Sangria grande',
      }),
    ).rejects.toBeInstanceOf(BadRequestException);
    const fechado = await caixas.closeCash(contexto, caixa.id, 15_100);
    expect(fechado).toMatchObject({ expectedCash: 15_000, difference: 100 });
    expect(await caixas.getCurrentSession(contexto, 'matriz')).toBeNull();
  });

  it('caixa de outro operador não se mexe', async () => {
    const { caixas } = montarPdv();
    const caixa = await caixas.openCash(contexto, 'matriz', 0);
    await expect(caixas.closeCash({ ...contexto, userId: 'outro' }, caixa.id, 0)).rejects.toThrow(
      'Caixa não encontrado',
    );
  });
});

describe('VendaDoPdvService', () => {
  const preparar = async () => {
    const pdv = montarPdv();
    await pdv.produtos.save(produtoDeTeste('racao', 150));
    await pdv.produtos.save(produtoDeTeste('bloqueada', 10, { status: 'blocked' }));
    pdv.fake.semear('tenants/tenant/funcionarios/func-15', vendedorDeTeste() as never);
    pdv.fake.semear(
      'tenants/tenant/funcionarios/func-bloq',
      vendedorDeTeste({ id: 'func-bloq', codigo: 16, bloqueado: true }) as never,
    );
    const caixa = await pdv.caixas.openCash(contexto, 'matriz', 10_000);
    return { ...pdv, caixa };
  };

  it('NFC-e: preço do catálogo, pagamento misto pelas formas da tabela e baixa de estoque', async () => {
    const { vendas, caixa, movimentos, repository } = await preparar();
    const emitidas: unknown[] = [];
    const venda = await vendas.concluir(
      contexto,
      caixa.id,
      {
        modo: 'NFCE',
        companyId: 'tenant',
        funcionarioId: 'func-15',
        items: [{ productId: 'racao', quantity: 2_000, unitPrice: 1, discount: 0, surcharge: 0 }],
        payments: [
          { formaCodigo: 2, amount: 20_000 },
          { formaCodigo: 4, amount: 10_000 },
        ],
      },
      { issueNfce: async (_t, _c, rascunho) => (emitidas.push(rascunho), 'nfce-1') },
    );
    expect(venda).toMatchObject({
      numero: 1,
      modo: 'NFCE',
      nfceDocumentId: 'nfce-1',
      total: 30_000,
      vendedorCodigo: 15,
      vendedorNome: 'RENIER PANTOJA',
      trocoCentavos: 0,
    });
    expect(venda.items[0]).toMatchObject({
      unitPrice: 15_000,
      codigo: 'SKU-racao',
      unidade: 'SC',
      pesoUnitarioKg: 25,
    });
    expect(venda.payments).toEqual([
      expect.objectContaining({ method: 'PIX', formaNome: 'PIX' }),
      expect.objectContaining({ method: 'CREDIT_CARD', formaCodigo: 4 }),
    ]);
    expect(emitidas).toHaveLength(1);
    expect(movimentos).toEqual([{ kind: 'SALE', productId: 'racao', delta: -2_000 }]);
    expect((await repository.find('tenant', caixa.id))?.expectedCash).toBe(10_000);
  });

  it('balcão: sem NFC-e, dinheiro com troco entra líquido na gaveta e imprime o pedido', async () => {
    const { vendas, caixa, repository } = await preparar();
    const venda = await vendas.concluir(
      contexto,
      caixa.id,
      {
        modo: 'BALCAO',
        companyId: 'tenant',
        funcionarioId: 'func-15',
        clienteNome: 'CONSUMIDOR FINAL',
        items: [{ productId: 'racao', quantity: 1_000, discount: 0, surcharge: 0 }],
        payments: [{ formaCodigo: 1, amount: 20_000 }],
      },
      semNfce,
    );
    expect(venda).toMatchObject({ nfceDocumentId: null, total: 15_000, trocoCentavos: 5_000 });
    expect(venda.payments).toEqual([expect.objectContaining({ method: 'CASH', amount: 15_000 })]);
    expect((await repository.find('tenant', caixa.id))?.expectedCash).toBe(25_000);

    const impressao = await vendas.impressao(contexto, venda.id);
    expect(impressao).toMatchObject({
      titulo: 'PEDIDO DE VENDA (SEM VALOR FISCAL)',
      numero: 1,
      vendedor: '15 - RENIER PANTOJA',
      cliente: { nome: 'CONSUMIDOR FINAL' },
      pagamentos: [{ descricao: '1 - DINHEIRO', valorCentavos: 15_000 }],
      pesoTotalKg: 25,
      totalLiquidoCentavos: 15_000,
    });
  });

  it('recusa vendedor bloqueado, produto bloqueado, desconto acima do limite e pagamento a menos', async () => {
    const { vendas, caixa } = await preparar();
    const base = {
      modo: 'BALCAO' as const,
      companyId: 'tenant',
      funcionarioId: 'func-15',
      items: [{ productId: 'racao', quantity: 1_000, discount: 0, surcharge: 0 }],
      payments: [{ formaCodigo: 1, amount: 15_000 }],
    };
    await expect(
      vendas.concluir(contexto, caixa.id, { ...base, funcionarioId: 'func-bloq' }, semNfce),
    ).rejects.toThrow(/não pode vender/);
    await expect(
      vendas.concluir(
        contexto,
        caixa.id,
        {
          ...base,
          items: [{ productId: 'bloqueada', quantity: 1_000, discount: 0, surcharge: 0 }],
        },
        semNfce,
      ),
    ).rejects.toThrow(/não pode ser vendido/);
    await expect(
      vendas.concluir(
        contexto,
        caixa.id,
        {
          ...base,
          items: [{ productId: 'racao', quantity: 1_000, discount: 2_000, surcharge: 0 }],
          payments: [{ formaCodigo: 1, amount: 13_000 }],
        },
        semNfce,
      ),
    ).rejects.toThrow(/limite de 10%/);
    await expect(
      vendas.concluir(
        contexto,
        caixa.id,
        { ...base, payments: [{ formaCodigo: 1, amount: 10_000 }] },
        semNfce,
      ),
    ).rejects.toThrow(/Faltam 50,00/);
    await expect(
      vendas.concluir(
        contexto,
        caixa.id,
        { ...base, payments: [{ formaCodigo: 4, amount: 20_000 }] },
        semNfce,
      ),
    ).rejects.toThrow(/troco/);
  });

  it('cancela a venda: cancela a NFC-e, devolve o estoque e tira o dinheiro da gaveta', async () => {
    const { vendas, caixa, movimentos, repository } = await preparar();
    const venda = await vendas.concluir(
      contexto,
      caixa.id,
      {
        modo: 'NFCE',
        companyId: 'tenant',
        funcionarioId: 'func-15',
        items: [{ productId: 'racao', quantity: 1_000, discount: 0, surcharge: 0 }],
        payments: [{ formaCodigo: 1, amount: 15_000 }],
      },
      { issueNfce: async () => 'nfce-9' },
    );
    const canceladas: string[] = [];
    const cancelada = await vendas.cancelar(
      contexto,
      venda.id,
      'Cliente desistiu da compra no caixa',
      {
        cancel: async (_tenant, documento) => {
          canceladas.push(documento);
          return {};
        },
      },
    );
    expect(cancelada).toMatchObject({
      situacao: 'CANCELADA',
      motivoDoCancelamento: 'Cliente desistiu da compra no caixa',
    });
    expect(canceladas).toEqual(['nfce-9']);
    expect(movimentos.at(-1)).toEqual({ kind: 'RETURN', productId: 'racao', delta: 1_000 });
    expect((await repository.find('tenant', caixa.id))?.expectedCash).toBe(10_000);
    await expect(
      vendas.cancelar(contexto, venda.id, 'Tentando cancelar de novo', {
        cancel: async () => ({}),
      }),
    ).rejects.toThrow(/já está cancelada/);
    expect((await vendas.historico(contexto, caixa.id)).map((item) => item.situacao)).toEqual([
      'CANCELADA',
    ]);
  });
});
