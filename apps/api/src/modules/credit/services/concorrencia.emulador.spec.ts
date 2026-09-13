import { ConflictException, UnprocessableEntityException } from '@nestjs/common';
import { getAdminFirestore } from '@synapse/firebase/admin';
import type { PedidoDeVenda, Titulo } from '@synapse/types';
import { TituloRepository } from '../../finance/repositories/titulo.repository';
import type { TenantContext } from '../../iam/iam.types';
import { RoleRepository } from '../../iam/repositories/role.repository';
import { RoleService } from '../../iam/services/role.service';
import { ClienteRepository } from '../repositories/cliente.repository';
import { PedidoDeVendaRepository } from '../repositories/pedido-de-venda.repository';
import { JUSTIFICATIVA } from '../testing/em-memoria';
import { cadastro, CLIENTE, liquidacao, pago, pedido, titulo } from '../testing/fixtures';
import { AnaliseDeCreditoService } from './analise-de-credito.service';
import { DecisaoDeCreditoService } from './decisao-de-credito.service';
import { LeitorDeCredito } from './leitor-de-credito';

/** Concorrencia de verdade, contra o emulador do Firestore — o mesmo mecanismo
 *  de transacao que a API usa em producao, sem mock. Roda com
 *  `pnpm test:credito:emulador`; sem FIRESTORE_EMULATOR_HOST, fica de fora
 *  (o `pnpm test` comum nao depende do emulador).
 *
 *  Cada teste usa um tenant proprio, entao nada aqui encosta em dado de outro. */

const noEmulador = process.env['FIRESTORE_EMULATOR_HOST'] ? describe : describe.skip;

/** Os repositorios e servicos reais, ligados ao emulador. Montado no beforeAll:
 *  o corpo de um describe.skip ainda roda, e sem emulador nao ha Firestore. */
const montarNoEmulador = () => {
  const db = getAdminFirestore();
  const pedidos = new PedidoDeVendaRepository(db);
  const titulos = new TituloRepository(db);
  const clientes = new ClienteRepository(db);
  const leitor = new LeitorDeCredito(pedidos, titulos, clientes);
  const roles = new RoleService(new RoleRepository());
  return {
    db,
    pedidos,
    titulos,
    decisoes: new DecisaoDeCreditoService(pedidos, titulos, clientes, leitor, roles),
    analise: new AnaliseDeCreditoService(pedidos, titulos, clientes, leitor, roles),
  };
};

noEmulador('credito no Firestore (emulador): concorrencia e contagem', () => {
  jest.setTimeout(60_000);

  let emulador: ReturnType<typeof montarNoEmulador>;
  beforeAll(() => {
    emulador = montarNoEmulador();
  });
  afterAll(async () => {
    await emulador.db.terminate();
  });

  let tenantId = '';
  const contexto = (userId: string, ...roleIds: string[]): TenantContext => ({
    tenantId,
    userId,
    roleIds,
    branchIds: [],
    warehouseIds: [],
  });
  const ANA = { uid: 'analista-ana', nome: 'Ana Crédito' };
  const BETO = { uid: 'analista-beto', nome: 'Beto Crédito' };

  /** Limite de R$ 10.000 e R$ 2.000 em aberto (vencendo em 2099), com 5
   *  titulos liquidados para o historico nao virar alerta. */
  const semear = async (novos: readonly PedidoDeVenda[], extras: readonly Titulo[] = []) => {
    tenantId = `concorrencia-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    await emulador.db
      .doc(`tenants/${tenantId}/customers/${CLIENTE}`)
      .set({ ...cadastro({ creditLimit: 1_000_000 }), tenantId });
    const base = [
      titulo({ id: 'aberto', valorOriginalCentavos: 200_000, vencimento: '2099-01-01' }),
      ...['a', 'b', 'c', 'd', 'e'].map((id) => pago(id, '2026-08-01', 0)),
      ...extras,
    ];
    for (const item of base)
      await emulador.titulos.create(tenantId, { ...item, tenantId } as Titulo);
    for (const item of novos) await emulador.pedidos.criar({ ...item, tenantId } as PedidoDeVenda);
  };

  const pedidoDe = (id: string, numero: number, totalCentavos: number) =>
    pedido({ id, numero, totalCentavos, enviadoEm: `2026-09-13T10:0${numero}:00.000Z` });

  const lido = async (id: string) => (await emulador.pedidos.buscar(tenantId, id)) as PedidoDeVenda;

  const DECISOES = new Set(['LIBERADO', 'LIBERADO_EXCECAO', 'REPROVADO']);
  const decisoesNoRastro = (item: PedidoDeVenda) =>
    item.historico.filter((evento) => DECISOES.has(evento.tipo));

  it('dois analistas, mesmo cliente: so uma aprovacao normal passa, a outra rele e falha', async () => {
    // 2.000 + 6.000 cabe; 2.000 + 6.000 + 6.000 nao.
    await semear([pedidoDe('pedido-a', 1, 600_000), pedidoDe('pedido-b', 2, 600_000)]);

    const resultados = await Promise.allSettled([
      emulador.decisoes.decidir(contexto(ANA.uid, 'FINANCEIRO'), ANA, 'pedido-a', {
        acao: 'APROVAR',
      }),
      emulador.decisoes.decidir(contexto(BETO.uid, 'FINANCEIRO'), BETO, 'pedido-b', {
        acao: 'APROVAR',
      }),
    ]);

    const aprovadas = resultados.filter((resultado) => resultado.status === 'fulfilled');
    const recusadas = resultados.flatMap((resultado) =>
      resultado.status === 'rejected' ? [resultado.reason] : [],
    );
    expect(aprovadas).toHaveLength(1);
    expect(recusadas).toHaveLength(1);
    expect(recusadas[0]).toBeInstanceOf(UnprocessableEntityException);

    const [a, b] = await Promise.all([lido('pedido-a'), lido('pedido-b')]);
    const situacoes = [a.situacao, b.situacao].sort();
    expect(situacoes).toEqual(['AGUARDANDO_ANALISE', 'APROVADO']);
    // O recusado nao ganhou evento de decisao; o aprovado ganhou um so.
    expect(decisoesNoRastro(a).length + decisoesNoRastro(b).length).toBe(1);

    const trava = await emulador.db.doc(`tenants/${tenantId}/travasDeCredito/${CLIENTE}`).get();
    expect(trava.data()).toMatchObject({ customerId: CLIENTE, versao: 1 });

    // Com o banco como ficou, o limite nao estourou.
    const painel = await emulador.analise.painel(contexto(ANA.uid, 'FINANCEIRO'), CLIENTE, 50);
    expect(painel.situacao.comprometidoCentavos).toBe(800_000);
    expect(painel.situacao.disponivelCentavos).toBe(200_000);
  });

  it('corrida com varios analistas: exatamente uma aprovacao, e o limite nunca estoura', async () => {
    const ids = ['p1', 'p2', 'p3', 'p4'];
    await semear(ids.map((id, indice) => pedidoDe(id, indice + 1, 600_000)));
    const resultados = await Promise.allSettled(
      ids.map((id) =>
        emulador.decisoes.decidir(contexto(`analista-${id}`, 'FINANCEIRO'), ANA, id, {
          acao: 'APROVAR',
        }),
      ),
    );
    expect(resultados.filter((resultado) => resultado.status === 'fulfilled')).toHaveLength(1);
    const lidos = await Promise.all(ids.map(lido));
    expect(lidos.filter((item) => item.situacao === 'APROVADO')).toHaveLength(1);
    for (const resultado of resultados) {
      if (resultado.status === 'rejected') {
        expect(resultado.reason).toBeInstanceOf(UnprocessableEntityException);
      }
    }
  });

  it('mesmo pedido, duas decisoes ao mesmo tempo: uma vence, a outra recebe conflito', async () => {
    await semear([pedidoDe('pedido-a', 1, 300_000)]);

    const resultados = await Promise.allSettled([
      emulador.decisoes.decidir(contexto(ANA.uid, 'FINANCEIRO'), ANA, 'pedido-a', {
        acao: 'APROVAR',
      }),
      emulador.decisoes.decidir(contexto(BETO.uid, 'FINANCEIRO'), BETO, 'pedido-a', {
        acao: 'REPROVAR',
        justificativa: 'Cliente pediu para segurar o pedido.',
      }),
    ]);

    expect(resultados.filter((resultado) => resultado.status === 'fulfilled')).toHaveLength(1);
    const conflito = resultados.flatMap((resultado) =>
      resultado.status === 'rejected' ? [resultado.reason] : [],
    );
    expect(conflito).toHaveLength(1);
    expect(conflito[0]).toBeInstanceOf(ConflictException);

    // Um evento de decisao so, e ele bate com a situacao gravada.
    const final = await lido('pedido-a');
    const eventos = decisoesNoRastro(final);
    expect(eventos).toHaveLength(1);
    expect(final.situacao).toBe(eventos[0]?.tipo === 'REPROVADO' ? 'REPROVADO' : 'APROVADO');
  });

  it('em analise nao compromete; aprovado compromete; o proximo e avaliado com o saldo novo', async () => {
    await semear([pedidoDe('pedido-a', 1, 600_000), pedidoDe('pedido-b', 2, 300_000)]);
    const financeiro = contexto(ANA.uid, 'FINANCEIRO');

    const antes = await emulador.analise.painel(financeiro, CLIENTE, 50);
    expect(antes.situacao.comprometidoCentavos).toBe(200_000);
    expect(antes.avaliacoes.every((avaliacao) => !avaliacao.violaPolitica)).toBe(true);

    await emulador.decisoes.decidir(financeiro, ANA, 'pedido-a', { acao: 'APROVAR' });

    const depois = await emulador.analise.painel(financeiro, CLIENTE, 50);
    expect(depois.situacao.aprovadosNaoFaturadosCentavos).toBe(600_000);
    expect(depois.situacao.comprometidoCentavos).toBe(800_000);
    const b = depois.avaliacoes.find((avaliacao) => avaliacao.pedidoId === 'pedido-b');
    expect(b?.motivos.map((motivo) => motivo.codigo)).toContain('LIMITE_INSUFICIENTE');
    await expect(
      emulador.decisoes.decidir(financeiro, ANA, 'pedido-b', { acao: 'APROVAR' }),
    ).rejects.toBeInstanceOf(UnprocessableEntityException);
  });

  it('aprovado de 5.000 conta 5.000; com o titulo gerado continua 5.000, nunca 10.000', async () => {
    await semear([pedidoDe('pedido-a', 1, 500_000)]);
    const financeiro = contexto(ANA.uid, 'FINANCEIRO');
    const comprometido = async () =>
      (await emulador.analise.painel(financeiro, CLIENTE, 50)).situacao.comprometidoCentavos;

    await emulador.decisoes.decidir(financeiro, ANA, 'pedido-a', { acao: 'APROVAR' });
    expect(await comprometido()).toBe(200_000 + 500_000);

    // O faturamento (fluxo que ainda nao existe na API) gera os titulos do pedido.
    for (const parcela of [1, 2]) {
      await emulador.titulos.create(tenantId, {
        ...titulo({
          id: `pedido-a-${parcela}`,
          orderId: 'pedido-a' as Titulo['orderId'],
          numeroParcela: parcela,
          totalDeParcelas: 2,
          valorOriginalCentavos: 250_000,
          vencimento: '2099-02-01',
        }),
        tenantId,
      } as Titulo);
    }
    expect(await comprometido()).toBe(200_000 + 500_000);

    // Pedido fechado como faturado: continua contando so pelos emulador.titulos.
    await emulador.db.doc(`tenants/${tenantId}/pedidosDeVenda/pedido-a`).update({
      situacao: 'FATURADO',
      nota: { numero: 9001, serie: 1, chaveDeAcesso: null, emitidaEm: new Date().toISOString() },
    });
    expect(await comprometido()).toBe(200_000 + 500_000);

    // Pagou uma parcela: sai do comprometido so o que foi pago.
    const primeira = await emulador.titulos.findById(tenantId, 'pedido-a-1');
    await emulador.titulos.update(tenantId, {
      ...(primeira as Titulo),
      status: 'QUITADO',
      liquidacoes: [liquidacao({ id: 'l1', valorCentavos: 250_000, data: '2026-09-13' })],
    });
    expect(await comprometido()).toBe(200_000 + 250_000);
  });

  it('aprovacao excepcional gravada no banco: os numeros da hora nao mudam depois', async () => {
    await semear([pedidoDe('pedido-a', 1, 900_000)]);
    const admin = contexto(ANA.uid, 'ADMIN_EMPRESA');
    await emulador.decisoes.decidir(admin, ANA, 'pedido-a', {
      acao: 'APROVAR_EXCECAO',
      justificativa: JUSTIFICATIVA,
    });
    const gravado = (await lido('pedido-a')).historico.at(-1);
    expect(gravado).toMatchObject({
      tipo: 'LIBERADO_EXCECAO',
      porUid: ANA.uid,
      cliente: { id: CLIENTE },
      justificativa: JUSTIFICATIVA,
      motivosForaDaPolitica: ['LIMITE_INSUFICIENTE'],
    });
    const valores = Object.fromEntries((gravado?.valores ?? []).map((v) => [v.campo, v]));
    expect(valores['comprometido']).toMatchObject({ antes: 200_000, depois: 1_100_000 });
    expect(valores['disponivel']).toMatchObject({ antes: 800_000, depois: -100_000 });

    // O cliente paga o titulo em aberto: a ficha muda, o evento gravado nao.
    const aberto = await emulador.titulos.findById(tenantId, 'aberto');
    await emulador.titulos.update(tenantId, {
      ...(aberto as Titulo),
      status: 'QUITADO',
      liquidacoes: [liquidacao({ id: 'l1', valorCentavos: 200_000, data: '2026-09-13' })],
    });
    expect((await lido('pedido-a')).historico.at(-1)).toEqual(gravado);
  });
});
