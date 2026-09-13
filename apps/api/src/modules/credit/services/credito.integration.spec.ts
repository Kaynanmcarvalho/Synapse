import {
  BadRequestException,
  ConflictException,
  NotFoundException,
  UnprocessableEntityException,
} from '@nestjs/common';
import type {
  CadastroDoCliente,
  PedidoDeVenda,
  ResultadoDaLiberacao,
  Titulo,
} from '@synapse/types';
import type { TituloRepository } from '../../finance/repositories/titulo.repository';
import type { ClienteRepository } from '../repositories/cliente.repository';
import type {
  DecisaoDoLote,
  PedidoDeVendaRepository,
  RegraDoLote,
} from '../repositories/pedido-de-venda.repository';
import { cadastro, CLIENTE, pago, pedido, titulo } from '../testing/fixtures';
import { AnaliseDeCreditoService } from './analise-de-credito.service';
import { DecisaoDeCreditoService } from './decisao-de-credito.service';
import { LeitorDeCredito } from './leitor-de-credito';

/** Os servicos de credito de ponta a ponta, com repositorios em memoria que
 *  imitam a semantica dos reais (inclusive os aprovados lidos na decisao). */

class PedidosEmMemoria {
  readonly dados = new Map<string, PedidoDeVenda>();
  private numero = 100;

  constructor(pedidos: readonly PedidoDeVenda[] = []) {
    for (const item of pedidos) this.dados.set(item.id, item);
  }

  private aprovadosDe(customerId: string) {
    return [...this.dados.values()].filter(
      (item) => item.customerId === customerId && item.situacao === 'APROVADO',
    );
  }

  proximoNumero = async () => (this.numero += 1);
  criar = async (novo: PedidoDeVenda) => {
    this.dados.set(novo.id, novo);
    return novo;
  };
  buscar = async (_t: string, id: string) => this.dados.get(id) ?? null;
  aguardandoAnalise = async () =>
    [...this.dados.values()].filter((item) => item.situacao === 'AGUARDANDO_ANALISE');
  aprovadosDosClientes = async (_t: string, ids: readonly string[]) =>
    [...this.dados.values()].filter(
      (item) => ids.includes(item.customerId) && item.situacao === 'APROVADO',
    );
  doCliente = async (_t: string, customerId: string) =>
    [...this.dados.values()].filter((item) => item.customerId === customerId);
  doClienteDesde = this.doCliente;
  doClientePorSituacao = async (_t: string, customerId: string, situacao: string) =>
    [...this.dados.values()].filter(
      (item) => item.customerId === customerId && item.situacao === situacao,
    );

  decidir = async (
    _t: string,
    id: string,
    regra: (lido: PedidoDeVenda, aprovados: readonly PedidoDeVenda[]) => PedidoDeVenda,
  ) => {
    const lido = this.dados.get(id);
    if (!lido) throw new NotFoundException('Pedido não encontrado');
    const decidido = regra(lido, this.aprovadosDe(lido.customerId));
    this.dados.set(id, decidido);
    return decidido;
  };

  liberar = async (
    _t: string,
    ids: readonly string[],
    regra: RegraDoLote,
  ): Promise<ResultadoDaLiberacao> => {
    const lidos = new Map(ids.map((id) => [id, this.dados.get(id) ?? null]));
    const clientes = [
      ...new Set([...lidos.values()].flatMap((item) => (item ? [item.customerId] : []))),
    ];
    const decisoes = regra(
      lidos,
      clientes.flatMap((id) => this.aprovadosDe(id)),
    );
    const resultado = {
      liberados: [] as string[],
      excepcionais: [] as string[],
      recusados: [] as { pedidoId: string; motivo: string }[],
    };
    for (const id of ids) {
      const decisao: DecisaoDoLote = decisoes.get(id) ?? { motivo: 'Pedido não avaliado' };
      if ('motivo' in decisao) resultado.recusados.push({ pedidoId: id, motivo: decisao.motivo });
      else {
        this.dados.set(id, decisao.pedido);
        resultado.liberados.push(id);
        if (decisao.excepcional) resultado.excepcionais.push(id);
      }
    }
    return resultado;
  };
}

class TitulosEmMemoria {
  chamadasEmLote = 0;
  chamadasPorCliente = 0;
  constructor(readonly dados: readonly Titulo[] = []) {}
  listByCliente = async (_t: string, customerId: string) => {
    this.chamadasPorCliente += 1;
    return this.dados.filter((item) => item.customerId === customerId);
  };
  listByClientes = async (_t: string, ids: readonly string[]) => {
    this.chamadasEmLote += 1;
    return this.dados.filter((item) => item.customerId && ids.includes(item.customerId));
  };
}

class ClientesEmMemoria {
  constructor(private readonly dados: ReadonlyMap<string, CadastroDoCliente>) {}
  buscar = async (_t: string, id: string) => this.dados.get(id) ?? null;
  buscarVarios = async (_t: string, ids: readonly string[]) =>
    new Map(
      ids.flatMap((id) => (this.dados.has(id) ? [[id, this.dados.get(id)]] : [])) as [
        string,
        CadastroDoCliente,
      ][],
    );
}

const CONTEXTO = {
  tenantId: 'tenant-1',
  userId: 'analista-1',
  roleIds: [],
  branchIds: [],
  warehouseIds: [],
};
const ANALISTA = { uid: 'analista-1', nome: 'João Crédito' };
const JUSTIFICATIVA = 'Cliente antecipou o pagamento do mês por PIX.';

/** Cliente com limite de R$ 10.000 e R$ 4.000 em aberto: cabe R$ 6.000. */
const montar = (
  pedidos: readonly PedidoDeVenda[],
  extras: { titulos?: Titulo[]; cadastros?: Map<string, CadastroDoCliente> } = {},
) => {
  const repositorioDePedidos = new PedidosEmMemoria(pedidos);
  const titulos = new TitulosEmMemoria(
    extras.titulos ?? [
      titulo({ id: 'aberto', valorOriginalCentavos: 400_000, vencimento: '2099-01-01' }),
      ...['a', 'b', 'c', 'd', 'e'].map((id) => pago(id, '2026-08-01', 0)),
    ],
  );
  const clientes = new ClientesEmMemoria(extras.cadastros ?? new Map([[CLIENTE, cadastro()]]));
  const p = repositorioDePedidos as unknown as PedidoDeVendaRepository;
  const t = titulos as unknown as TituloRepository;
  const c = clientes as unknown as ClienteRepository;
  const leitor = new LeitorDeCredito(p, t, c);
  return {
    pedidos: repositorioDePedidos,
    titulos,
    analise: new AnaliseDeCreditoService(p, t, c, leitor),
    decisoes: new DecisaoDeCreditoService(p, t, c, leitor),
  };
};

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
