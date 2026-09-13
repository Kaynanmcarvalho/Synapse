import type {
  AvaliacaoDoPedido,
  DetalheDoPedido,
  EventoDoPedido,
  PainelDeAnaliseDeCredito,
  PedidoDeVenda,
} from '@synapse/types';
import { PARAMETROS_PADRAO } from '@synapse/validation';
import { describe, expect, it } from 'vitest';
import { feedDoPedido } from './analise/feed';
import { lancadoPor } from './documentos/autoria';
import { linhaDoPedido } from './documentos/linha-do-pedido';
import { loteDaSelecao, mensagemDaLiberacao } from './useFichaDoCliente';

const evento = (extra: Partial<EventoDoPedido>): EventoDoPedido => ({
  tipo: 'LANCADO',
  etapa: 'VENDEDOR',
  em: '2026-09-13T10:00:00.000Z',
  porUid: 'caixa-1',
  porNome: 'Caixa 1',
  detalhe: null,
  ...extra,
});

const pedido = (extra: Partial<PedidoDeVenda> = {}): PedidoDeVenda =>
  ({
    id: 'p1',
    numero: 1,
    situacao: 'AGUARDANDO_ANALISE',
    enviadoEm: '2026-09-13T10:00:00.000Z',
    historico: [],
    observacoes: [],
    nota: null,
    ...extra,
  }) as unknown as PedidoDeVenda;

const avaliacao = (pedidoId: string, exposicaoCentavos: number): AvaliacaoDoPedido =>
  ({
    pedidoId,
    exposicao: {
      valorComercialCentavos: exposicaoCentavos,
      entradaCentavos: 0,
      financiadoCentavos: exposicaoCentavos,
      exposicaoCentavos,
      natureza: 'A_PRAZO',
      consomeLimite: exposicaoCentavos > 0,
      explicacao: '',
    },
  }) as unknown as AvaliacaoDoPedido;

const painel = {
  pedidosEmAnalise: [
    pedido({ id: 'a', enviadoEm: '2026-09-12T10:00:00.000Z' }),
    pedido({ id: 'b', enviadoEm: '2026-09-13T10:00:00.000Z' }),
  ],
  avaliacoes: [avaliacao('a', 400_000), avaliacao('b', 400_000)],
  parametros: PARAMETROS_PADRAO,
  situacao: {
    limiteCentavos: 1_000_000,
    comprometidoCentavos: 400_000,
    disponivelCentavos: 600_000,
    bloqueado: false,
    inadimplencia: { bloqueia: false, motivo: null, mensagem: null },
    titulosVencidos: 0,
    diasDeAtrasoMaximo: 0,
    vencidoCentavos: 0,
    cadastro: { existe: true, faltando: [] },
    titulosLiquidados: 10,
    possuiTitulos: true,
  },
} as unknown as PainelDeAnaliseDeCredito;

describe('selecao da ficha', () => {
  it('sem selecao, o disponivel e o de hoje', () => {
    expect(loteDaSelecao(painel, new Set()).disponivelDepoisCentavos).toBe(600_000);
  });

  it('a selecao usa a regra de lote: o segundo pedido passa do limite', () => {
    const lote = loteDaSelecao(painel, new Set(['a', 'b']));
    expect(lote.exposicaoCentavos).toBe(800_000);
    expect(lote.excepcionais).toEqual(['b']);
    expect(lote.disponivelDepoisCentavos).toBe(-200_000);
  });

  it('o aviso separa aprovados, excecoes e recusados', () => {
    expect(
      mensagemDaLiberacao({ liberados: ['a', 'b'], excepcionais: ['b'], recusados: [] }),
    ).toEqual({
      mensagem:
        '2 pedidos aprovados e enviados ao faturamento (1 fora da política, com justificativa).',
      tom: 'sucesso',
    });
    expect(
      mensagemDaLiberacao({
        liberados: [],
        recusados: [{ pedidoId: 'b', motivo: 'Pedido 2 fora da política.' }],
      }).tom,
    ).toBe('alerta');
  });
});

describe('feed de observacoes', () => {
  it('junta observacoes e justificativas de decisao, do mais recente para tras', () => {
    const feed = feedDoPedido(
      pedido({
        observacoes: [
          {
            id: 'o1',
            etapa: 'VENDEDOR',
            texto: 'Entregar sexta.',
            em: '2026-09-13T09:00:00Z',
            porUid: 'v',
            porNome: 'Marcos',
          },
          {
            id: 'o2',
            etapa: 'CREDITO',
            texto: 'Cliente ligou.',
            em: '2026-09-13T11:00:00Z',
            porUid: 'c',
            porNome: 'Carla',
          },
        ],
        historico: [
          evento({
            tipo: 'LIBERADO_EXCECAO',
            etapa: 'CREDITO',
            em: '2026-09-13T12:00:00Z',
            porNome: 'João',
            justificativa: 'Pagou o vencido hoje.',
          }),
          evento({ tipo: 'LIBERADO', etapa: 'CREDITO', em: '2026-09-13T12:30:00Z' }),
        ],
      }),
    );
    expect(feed.map((entrada) => [entrada.categoria, entrada.texto])).toEqual([
      ['DECISAO', 'Pagou o vencido hoje.'],
      ['FINANCEIRA', 'Cliente ligou.'],
      ['VENDEDOR', 'Entregar sexta.'],
    ]);
  });
});

describe('caminho do pedido', () => {
  const detalhe = (extra: Partial<PedidoDeVenda>, titulos = 0): DetalheDoPedido =>
    ({
      pedido: pedido(extra),
      lancadoPor: null,
      titulos: Array.from({ length: titulos }, (_, indice) => ({ id: `t${indice}` })),
    }) as unknown as DetalheDoPedido;

  it('mostra so o que foi registrado; o resto fica aguardando', () => {
    const passos = linhaDoPedido(
      detalhe(
        {
          situacao: 'FATURADO',
          nota: { numero: 4388, serie: 1, chaveDeAcesso: null, emitidaEm: '2026-09-14T10:00:00Z' },
          historico: [evento({}), evento({ tipo: 'LIBERADO', etapa: 'CREDITO', porNome: 'Carla' })],
        },
        2,
      ),
    );
    expect(passos.map((passo) => [passo.id, passo.feito])).toEqual([
      ['lancado', true],
      ['credito', true],
      ['faturado', false],
      ['nota', true],
      ['titulos', true],
      ['rota', false],
      ['entregue', false],
    ]);
    expect(passos[1]?.rotulo).toBe('Aprovado no crédito');
  });

  it('reprovado encerra o caminho; cancelado aparece como final', () => {
    const reprovado = linhaDoPedido(
      detalhe({ historico: [evento({}), evento({ tipo: 'REPROVADO', etapa: 'CREDITO' })] }),
    );
    expect(reprovado.map((passo) => passo.id)).toEqual(['lancado', 'credito']);
    expect(reprovado[1]?.final).toBe('reprovado');

    const cancelado = linhaDoPedido(detalhe({ situacao: 'CANCELADO', historico: [evento({})] }));
    expect(cancelado.at(-1)).toMatchObject({ id: 'cancelado', final: 'cancelado', em: null });
  });
});

describe('quem lancou o pedido', () => {
  it('nao confunde o usuario que digitou com o representante', () => {
    expect(lancadoPor(pedido({ lancadoPor: { uid: 'caixa-1', nome: 'Caixa 1' } }))?.nome).toBe(
      'Caixa 1',
    );
    expect(lancadoPor(pedido({ historico: [evento({ porNome: 'Caixa 2' })] }))?.nome).toBe(
      'Caixa 2',
    );
    expect(lancadoPor(pedido())).toBeNull();
  });
});
