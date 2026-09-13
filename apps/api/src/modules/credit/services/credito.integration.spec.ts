import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  UnprocessableEntityException,
} from '@nestjs/common';
import { cadastro, CLIENTE, pedido } from '../testing/fixtures';
import { ANALISTA, CONTEXTO, FINANCEIRO, JUSTIFICATIVA, montar } from '../testing/em-memoria';

describe('decisao de um pedido', () => {
  it('dentro da politica: aprova e grava o antes/depois', async () => {
    const { decisoes, pedidos } = montar([pedido({ totalCentavos: 500_000 })]);
    const { pedido: aprovado, avaliacao } = await decisoes.decidir(CONTEXTO, ANALISTA, 'pedido-1', {
      acao: 'APROVAR',
    });
    expect(aprovado.situacao).toBe('APROVADO');
    expect(avaliacao.violaPolitica).toBe(false);
    expect(pedidos.dados.get('pedido-1')?.historico.at(-1)).toMatchObject({
      tipo: 'LIBERADO',
      porNome: 'João Crédito',
      valores: expect.arrayContaining([
        expect.objectContaining({ campo: 'disponivel', antes: 600_000, depois: 100_000 }),
      ]),
    });
  });

  it('fora da politica: "Aprovar" e recusado e o pedido nao muda', async () => {
    const { decisoes, pedidos } = montar([pedido({ totalCentavos: 700_000 })]);
    await expect(
      decisoes.decidir(CONTEXTO, ANALISTA, 'pedido-1', { acao: 'APROVAR' }),
    ).rejects.toBeInstanceOf(UnprocessableEntityException);
    expect(pedidos.dados.get('pedido-1')?.situacao).toBe('AGUARDANDO_ANALISE');
  });

  it('aprovacao excepcional exige justificativa', async () => {
    const { decisoes } = montar([pedido({ totalCentavos: 700_000 })]);
    await expect(
      decisoes.decidir(CONTEXTO, ANALISTA, 'pedido-1', {
        acao: 'APROVAR_EXCECAO',
        justificativa: 'ok',
      }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('aprovacao excepcional com justificativa passa e fica no rastro', async () => {
    const { decisoes } = montar([pedido({ totalCentavos: 700_000 })]);
    const { pedido: aprovado, avaliacao } = await decisoes.decidir(CONTEXTO, ANALISTA, 'pedido-1', {
      acao: 'APROVAR_EXCECAO',
      justificativa: JUSTIFICATIVA,
    });
    expect(avaliacao.violaPolitica).toBe(true);
    expect(aprovado.historico.at(-1)).toMatchObject({
      tipo: 'LIBERADO_EXCECAO',
      justificativa: JUSTIFICATIVA,
      motivos: ['LIMITE_INSUFICIENTE'],
    });
  });

  it('pedido aprovado por outro analista entra no comprometido de quem decide depois', async () => {
    const { decisoes } = montar([
      pedido({ id: 'ja-aprovado', situacao: 'APROVADO', totalCentavos: 500_000 }),
      pedido({ totalCentavos: 200_000 }),
    ]);
    await expect(
      decisoes.decidir(CONTEXTO, ANALISTA, 'pedido-1', { acao: 'APROVAR' }),
    ).rejects.toBeInstanceOf(UnprocessableEntityException);
  });

  it('reprovar exige justificativa e tira o pedido da fila', async () => {
    const { decisoes } = montar([pedido()]);
    await expect(
      decisoes.decidir(CONTEXTO, ANALISTA, 'pedido-1', { acao: 'REPROVAR' }),
    ).rejects.toBeInstanceOf(BadRequestException);
    const { pedido: reprovado } = await decisoes.decidir(CONTEXTO, ANALISTA, 'pedido-1', {
      acao: 'REPROVAR',
      justificativa: 'Cadastro com restrição no Serasa.',
    });
    expect(reprovado.situacao).toBe('REPROVADO');
  });

  it('pedido ja decidido nao e decidido de novo', async () => {
    const { decisoes } = montar([pedido({ situacao: 'APROVADO' })]);
    await expect(
      decisoes.decidir(CONTEXTO, ANALISTA, 'pedido-1', { acao: 'APROVAR' }),
    ).rejects.toBeInstanceOf(ConflictException);
  });

  it('troca de cliente sem limite e aprovada sem excecao', async () => {
    const { decisoes } = montar([pedido({ tipo: 'TROCA' })], { cadastros: new Map() });
    const { avaliacao } = await decisoes.decidir(CONTEXTO, ANALISTA, 'pedido-1', {
      acao: 'APROVAR',
    });
    expect(avaliacao.exposicao.exposicaoCentavos).toBe(0);
    expect(avaliacao.violaPolitica).toBe(false);
  });
});

describe('liberacao em lote', () => {
  const dois = () => [
    pedido({ id: 'antigo', numero: 1, totalCentavos: 400_000, enviadoEm: '2026-09-12T10:00:00Z' }),
    pedido({ id: 'novo', numero: 2, totalCentavos: 400_000, enviadoEm: '2026-09-13T10:00:00Z' }),
  ];

  it('consome o limite do mais antigo para o mais recente; sem justificativa, o excedente fica', async () => {
    const { decisoes } = montar(dois());
    const resultado = await decisoes.liberar(CONTEXTO, ANALISTA, ['novo', 'antigo'], null);
    expect(resultado.liberados).toEqual(['antigo']);
    expect(resultado.recusados).toEqual([
      { pedidoId: 'novo', motivo: expect.stringContaining('fora da política') },
    ]);
  });

  it('com justificativa, o excedente passa como excepcional', async () => {
    const { decisoes, pedidos } = montar(dois());
    const resultado = await decisoes.liberar(CONTEXTO, ANALISTA, ['novo', 'antigo'], JUSTIFICATIVA);
    expect([...resultado.liberados].sort()).toEqual(['antigo', 'novo']);
    expect(resultado.excepcionais).toEqual(['novo']);
    expect(pedidos.dados.get('novo')?.historico.at(-1)?.tipo).toBe('LIBERADO_EXCECAO');
    expect(pedidos.dados.get('antigo')?.historico.at(-1)?.tipo).toBe('LIBERADO');
    expect(pedidos.dados.get('antigo')?.historico.at(-1)).not.toHaveProperty('justificativa');
  });
});

describe('fila', () => {
  it('le titulos em lote, sem uma consulta por cliente, e traz exposicao e motivos', async () => {
    const { analise, titulos } = montar(
      [
        pedido({ id: 'p1', customerId: CLIENTE as never, totalCentavos: 700_000 }),
        pedido({ id: 'p2', customerId: 'cliente-2' as never, tipo: 'TROCA' }),
        pedido({ id: 'p3', customerId: 'cliente-3' as never }),
      ],
      { cadastros: new Map([[CLIENTE, cadastro()]]) },
    );
    const fila = await analise.fila(CONTEXTO, 200);
    expect(titulos.chamadasEmLote).toBe(1);
    expect(titulos.chamadasPorCliente).toBe(0);

    const porId = new Map(fila.map((linha) => [linha.pedido.id, linha.avaliacao]));
    expect(porId.get('p1')?.motivos.map((m) => m.codigo)).toContain('LIMITE_INSUFICIENTE');
    expect(porId.get('p2')?.exposicao.exposicaoCentavos).toBe(0);
    expect(porId.get('p3')?.motivos.map((m) => m.codigo)).toEqual(
      expect.arrayContaining(['SEM_LIMITE_DE_CREDITO', 'CADASTRO_INCOMPLETO']),
    );
  });
});

describe('entrada do pedido', () => {
  it('soma frete ao total, guarda quem lancou e registra por que entrou em analise', async () => {
    const { analise } = montar([]);
    const criado = await analise.registrar(
      CONTEXTO,
      { uid: 'caixa-1', nome: 'Caixa 1' },
      {
        branchId: 'filial-1',
        customerId: CLIENTE,
        clienteNome: 'Mercado do Bairro',
        clienteDocumento: null,
        clienteCidade: null,
        clienteBairro: null,
        tipo: 'VENDA',
        origem: 'BALCAO',
        vendedorId: 'vendedor-1',
        vendedorNome: 'Marcos Vendas',
        condicaoDePagamento: '28/35',
        vencimentosEmDias: [28, 35],
        formaDePagamento: 'Boleto',
        freteCentavos: 5_000,
        acrescimoCentavos: 0,
        entradaCentavos: 0,
        observacao: null,
        itens: [
          {
            productId: 'p',
            descricao: 'Arroz',
            quantidade: 2_000,
            precoUnitarioCentavos: 350_000,
            descontoCentavos: 0,
          },
        ],
      },
    );
    expect(criado.totalCentavos).toBe(705_000);
    expect(criado.freteCentavos).toBe(5_000);
    expect(criado.lancadoPor).toEqual({ uid: 'caixa-1', nome: 'Caixa 1' });
    expect(criado.vendedorNome).toBe('Marcos Vendas');
    expect(criado.analiseNoEnvio?.motivos.map((m) => m.codigo)).toContain('LIMITE_INSUFICIENTE');
    expect(criado.historico.map((e) => e.tipo)).toEqual(['LANCADO', 'ANALISE_ACIONADA']);
  });
});

describe('ficha do cliente', () => {
  it('traz situacao, comportamento e uma avaliacao por pedido em analise', async () => {
    const { analise } = montar([
      pedido({ id: 'p1', totalCentavos: 100_000 }),
      pedido({ id: 'p2', totalCentavos: 900_000, enviadoEm: '2026-09-12T10:00:00Z' }),
      pedido({ id: 'f1', situacao: 'FATURADO', enviadoEm: '2026-08-01T10:00:00Z' }),
    ]);
    const painel = await analise.painel(CONTEXTO, CLIENTE, 150);
    expect(painel.cliente.codigo).toBe('C-0042');
    expect(painel.situacao).toMatchObject({ limiteCentavos: 1_000_000, emAbertoCentavos: 400_000 });
    expect(painel.comportamento.titulosConsiderados).toBe(5);
    expect(painel.avaliacoes.map((a) => a.pedidoId)).toEqual(
      painel.pedidosEmAnalise.map((p) => p.id),
    );
    const grande = painel.avaliacoes.find((a) => a.pedidoId === 'p2');
    expect(grande?.violaPolitica).toBe(true);
    expect(grande?.sinais.length).toBeGreaterThan(0);
  });
});

describe('permissao de aprovacao excepcional', () => {
  it('financeiro aprova dentro da politica', async () => {
    const { decisoes } = montar([pedido({ totalCentavos: 500_000 })]);
    const { pedido: aprovado } = await decisoes.decidir(FINANCEIRO, ANALISTA, 'pedido-1', {
      acao: 'APROVAR',
    });
    expect(aprovado.situacao).toBe('APROVADO');
  });

  it('financeiro nao aprova excecao, nem com justificativa, e o pedido nao muda', async () => {
    const { decisoes, pedidos } = montar([pedido({ totalCentavos: 700_000 })]);
    await expect(
      decisoes.decidir(FINANCEIRO, ANALISTA, 'pedido-1', {
        acao: 'APROVAR_EXCECAO',
        justificativa: JUSTIFICATIVA,
      }),
    ).rejects.toBeInstanceOf(ForbiddenException);
    expect(pedidos.dados.get('pedido-1')?.situacao).toBe('AGUARDANDO_ANALISE');
    expect(pedidos.dados.get('pedido-1')?.historico).toEqual([]);
  });

  it('financeiro tentando "Aprovar" fora da politica recebe 422 dizendo que falta a permissao', async () => {
    const { decisoes } = montar([pedido({ totalCentavos: 700_000 })]);
    await expect(
      decisoes.decidir(FINANCEIRO, ANALISTA, 'pedido-1', { acao: 'APROVAR' }),
    ).rejects.toThrow('você não possui permissão para essa decisão');
  });

  it('a permissao vem antes da justificativa: sem permissao e sem texto, 403', async () => {
    const { decisoes } = montar([pedido({ totalCentavos: 700_000 })]);
    await expect(
      decisoes.decidir(FINANCEIRO, ANALISTA, 'pedido-1', { acao: 'APROVAR_EXCECAO' }),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('no lote, a justificativa sozinha nao libera o fora da politica para quem nao tem a permissao', async () => {
    const { decisoes, pedidos } = montar([
      pedido({
        id: 'antigo',
        numero: 1,
        totalCentavos: 400_000,
        enviadoEm: '2026-09-12T10:00:00Z',
      }),
      pedido({ id: 'novo', numero: 2, totalCentavos: 400_000, enviadoEm: '2026-09-13T10:00:00Z' }),
    ]);
    const resultado = await decisoes.liberar(
      FINANCEIRO,
      ANALISTA,
      ['antigo', 'novo'],
      JUSTIFICATIVA,
    );
    expect(resultado.liberados).toEqual(['antigo']);
    expect(resultado.excepcionais).toEqual([]);
    expect(resultado.recusados).toEqual([
      { pedidoId: 'novo', motivo: expect.stringContaining('exige aprovação excepcional') },
    ]);
    expect(pedidos.dados.get('novo')?.situacao).toBe('AGUARDANDO_ANALISE');
  });

  it('a ficha diz o que o usuario pode decidir', async () => {
    const { analise } = montar([pedido()]);
    expect((await analise.painel(CONTEXTO, CLIENTE, 50)).permissoes).toEqual({
      decidir: true,
      aprovarExcecao: true,
    });
    expect((await analise.painel(FINANCEIRO, CLIENTE, 50)).permissoes).toEqual({
      decidir: true,
      aprovarExcecao: false,
    });
  });
});

describe('em analise x aprovado', () => {
  it('criar, entrar em analise e aprovar: o proximo pedido e avaliado com o saldo novo', async () => {
    // Limite 10.000, 4.000 em aberto: cabem 6.000.
    const { analise, decisoes } = montar([
      pedido({ id: 'a', numero: 1, totalCentavos: 500_000 }),
      pedido({ id: 'b', numero: 2, totalCentavos: 200_000 }),
    ]);
    // Em analise, nenhum dos dois compromete: os dois cabem sozinhos.
    const antes = await analise.painel(CONTEXTO, CLIENTE, 50);
    expect(antes.situacao.aprovadosNaoFaturadosCentavos).toBe(0);
    expect(antes.avaliacoes.every((avaliacao) => !avaliacao.violaPolitica)).toBe(true);

    await decisoes.decidir(CONTEXTO, ANALISTA, 'a', { acao: 'APROVAR' });

    const depois = await analise.painel(CONTEXTO, CLIENTE, 50);
    expect(depois.situacao.aprovadosNaoFaturadosCentavos).toBe(500_000);
    expect(depois.situacao.disponivelCentavos).toBe(100_000);
    const b = depois.avaliacoes.find((avaliacao) => avaliacao.pedidoId === 'b');
    expect(b?.violaPolitica).toBe(true);
    expect(b?.motivos.map((motivo) => motivo.codigo)).toContain('LIMITE_INSUFICIENTE');
    await expect(
      decisoes.decidir(CONTEXTO, ANALISTA, 'b', { acao: 'APROVAR' }),
    ).rejects.toBeInstanceOf(UnprocessableEntityException);
  });
});

describe('auditoria da aprovacao excepcional', () => {
  it('grava quem, quando, pedido, cliente, motivos, justificativa e os numeros da hora', async () => {
    const { decisoes, pedidos } = montar([pedido({ totalCentavos: 700_000 })]);
    await decisoes.decidir(CONTEXTO, ANALISTA, 'pedido-1', {
      acao: 'APROVAR_EXCECAO',
      justificativa: JUSTIFICATIVA,
    });
    const evento = pedidos.dados.get('pedido-1')?.historico.at(-1);
    expect(evento).toMatchObject({
      tipo: 'LIBERADO_EXCECAO',
      porUid: 'analista-1',
      porNome: 'João Crédito',
      em: expect.stringMatching(/^\d{4}-\d{2}-\d{2}T/),
      justificativa: JUSTIFICATIVA,
      cliente: { id: CLIENTE, nome: 'Mercado do Bairro' },
      motivos: ['LIMITE_INSUFICIENTE'],
      motivosForaDaPolitica: ['LIMITE_INSUFICIENTE'],
    });
    const valores = Object.fromEntries((evento?.valores ?? []).map((v) => [v.campo, v]));
    expect(valores['limite']).toMatchObject({ antes: 1_000_000, depois: 1_000_000 });
    expect(valores['exposicao']).toMatchObject({ depois: 700_000 });
    expect(valores['comprometido']).toMatchObject({ antes: 400_000, depois: 1_100_000 });
    expect(valores['disponivel']).toMatchObject({ antes: 600_000, depois: -100_000 });
  });

  it('os numeros ficam congelados: pagar titulos depois nao muda o que foi gravado', async () => {
    const montado = montar([pedido({ totalCentavos: 700_000 })]);
    await montado.decisoes.decidir(CONTEXTO, ANALISTA, 'pedido-1', {
      acao: 'APROVAR_EXCECAO',
      justificativa: JUSTIFICATIVA,
    });
    const gravado = structuredClone(montado.pedidos.dados.get('pedido-1')?.historico.at(-1));

    // O cliente paga o titulo em aberto; a ficha muda, o evento nao.
    montado.titulos.dados = montado.titulos.dados.filter((item) => item.id !== 'aberto');
    const painel = await montado.analise.painel(CONTEXTO, CLIENTE, 50);
    expect(painel.situacao.emAbertoCentavos).toBe(0);
    expect(montado.pedidos.dados.get('pedido-1')?.historico.at(-1)).toEqual(gravado);
  });
});
