import type { MotivoDaAnalise } from '@synapse/types';
import { exposicaoDoPedido, impactoDaAprovacao } from '@synapse/validation';
import { pedido, situacao } from '../testing/fixtures';
import {
  acionarAnalise,
  INTERVALO_DE_VISUALIZACAO_MS,
  lancadoPorDe,
  liberarPedido,
  registrarVisualizacao,
  reprovarPedido,
  SYNAPSE,
} from './historico';

const ANALISTA = { uid: 'analista-1', nome: 'João Crédito' };
const AGORA = '2026-09-13T10:00:00.000Z';

const LIMITE_INSUFICIENTE: MotivoDaAnalise = {
  codigo: 'LIMITE_INSUFICIENTE',
  rotulo: 'Limite insuficiente',
  detalhe: 'Exposição de R$ 7.000,00 para R$ 6.000,00 disponíveis.',
  violaPolitica: true,
};

const impacto = impactoDaAprovacao(
  situacao({ comprometidoCentavos: 400_000 }),
  exposicaoDoPedido(pedido({ totalCentavos: 700_000 })),
);

describe('aprovacao excepcional', () => {
  it('grava o evento proprio, com justificativa, motivos e os numeros antes/depois', () => {
    const aprovado = liberarPedido(pedido(), ANALISTA, AGORA, {
      excepcional: true,
      justificativa: 'Cliente antecipou o boleto de outubro por PIX hoje.',
      motivos: [LIMITE_INSUFICIENTE],
      impacto,
    });
    const ultimo = aprovado.historico.at(-1);
    expect(aprovado.situacao).toBe('APROVADO');
    expect(ultimo).toMatchObject({
      tipo: 'LIBERADO_EXCECAO',
      etapa: 'CREDITO',
      porUid: 'analista-1',
      porNome: 'João Crédito',
      em: AGORA,
      justificativa: 'Cliente antecipou o boleto de outubro por PIX hoje.',
      motivos: ['LIMITE_INSUFICIENTE'],
    });
    expect(ultimo?.detalhe).toContain('limite insuficiente');
    expect(ultimo?.valores).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ campo: 'disponivel', antes: 600_000, depois: -100_000 }),
        expect.objectContaining({ campo: 'utilizacao', antes: 40, depois: 110 }),
      ]),
    );
  });

  it('aprovacao comum continua sendo LIBERADO e nao inventa justificativa', () => {
    const ultimo = liberarPedido(pedido(), ANALISTA, AGORA, {
      excepcional: false,
      justificativa: null,
      motivos: [],
      impacto,
    }).historico.at(-1);
    expect(ultimo?.tipo).toBe('LIBERADO');
    expect(ultimo).not.toHaveProperty('justificativa');
  });

  it('o rastro so cresce: nada anterior e alterado', () => {
    const antes = pedido({
      historico: [
        {
          tipo: 'LANCADO',
          etapa: 'VENDEDOR',
          em: '2026-09-12T10:00:00Z',
          porUid: 'v',
          porNome: 'Caixa 1',
          detalhe: null,
        },
      ],
    });
    const depois = liberarPedido(antes, ANALISTA, AGORA);
    expect(depois.historico.slice(0, 1)).toEqual(antes.historico);
    expect(depois.historico).toHaveLength(2);
  });
});

describe('reprovacao', () => {
  it('sai da fila como reprovado, com quem, quando e por que', () => {
    const reprovado = reprovarPedido(pedido(), ANALISTA, AGORA, {
      excepcional: false,
      justificativa: 'Cliente com protesto em cartório; aguardar regularização.',
      motivos: [LIMITE_INSUFICIENTE],
      impacto,
    });
    expect(reprovado.situacao).toBe('REPROVADO');
    expect(reprovado.analisadoPor).toBe('analista-1');
    expect(reprovado.historico.at(-1)).toMatchObject({
      tipo: 'REPROVADO',
      justificativa: 'Cliente com protesto em cartório; aguardar regularização.',
    });
  });
});

describe('motivo registrado na chegada', () => {
  it('o Synapse grava os motivos no pedido e no historico', () => {
    const acionado = acionarAnalise(pedido(), {
      avaliadaEm: AGORA,
      motivos: [LIMITE_INSUFICIENTE],
    });
    expect(acionado.analiseNoEnvio?.motivos).toEqual([LIMITE_INSUFICIENTE]);
    expect(acionado.historico.at(-1)).toMatchObject({
      tipo: 'ANALISE_ACIONADA',
      porUid: SYNAPSE.uid,
      porNome: 'Synapse',
      detalhe: 'Análise acionada: limite insuficiente',
      motivos: ['LIMITE_INSUFICIENTE'],
    });
  });
});

describe('visualizacao', () => {
  it('registra a primeira abertura e ignora a repeticao dentro de meia hora', () => {
    const visto = registrarVisualizacao(pedido(), ANALISTA, AGORA);
    expect(visto?.historico.at(-1)).toMatchObject({ tipo: 'VISUALIZADO', porNome: 'João Crédito' });

    const logoDepois = new Date(Date.parse(AGORA) + 60_000).toISOString();
    expect(registrarVisualizacao(visto ?? pedido(), ANALISTA, logoDepois)).toBeNull();

    const outraPessoa = registrarVisualizacao(
      visto ?? pedido(),
      { uid: 'x', nome: 'Ana' },
      logoDepois,
    );
    expect(outraPessoa?.historico).toHaveLength(2);

    const maisTarde = new Date(Date.parse(AGORA) + INTERVALO_DE_VISUALIZACAO_MS + 1).toISOString();
    expect(registrarVisualizacao(visto ?? pedido(), ANALISTA, maisTarde)?.historico).toHaveLength(
      2,
    );
  });
});

describe('representante x usuario que lancou', () => {
  it('usa o campo novo e, nos pedidos antigos, o autor do evento LANCADO', () => {
    expect(lancadoPorDe(pedido({ lancadoPor: { uid: 'caixa-1', nome: 'Caixa 1' } }))).toEqual({
      uid: 'caixa-1',
      nome: 'Caixa 1',
    });
    const antigo = pedido({
      historico: [
        {
          tipo: 'LANCADO',
          etapa: 'VENDEDOR',
          em: AGORA,
          porUid: 'caixa-2',
          porNome: 'Caixa 2',
          detalhe: null,
        },
      ],
    });
    expect(lancadoPorDe(antigo)).toEqual({ uid: 'caixa-2', nome: 'Caixa 2' });
    expect(lancadoPorDe(pedido())).toBeNull();
  });
});
