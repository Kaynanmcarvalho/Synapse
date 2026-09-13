import type { ExposicaoDoPedido, SituacaoDeCredito } from '@synapse/types';
import { describe, expect, it } from 'vitest';
import {
  avaliarLote,
  impactoDaAprovacao,
  justificativaValida,
  motivosDaAnalise,
  PARAMETROS_PADRAO,
  utilizacaoDoLimite,
  violaPolitica,
} from './politica';

const situacao = (dados: Partial<SituacaoDeCredito> = {}): SituacaoDeCredito => ({
  limiteCentavos: 1_000_000,
  emAbertoCentavos: 400_000,
  vencidoCentavos: 0,
  aVencerCentavos: 400_000,
  aprovadosNaoFaturadosCentavos: 0,
  comprometidoCentavos: 400_000,
  disponivelCentavos: 600_000,
  titulosVencidos: 0,
  diasDeAtrasoMaximo: 0,
  bloqueado: false,
  inadimplencia: { bloqueia: false, motivo: null, mensagem: null },
  cadastro: { existe: true, faltando: [] },
  titulosLiquidados: 12,
  possuiTitulos: true,
  calculadoEm: '2026-09-13T12:00:00.000Z',
  ...dados,
});

const aPrazo = (exposicaoCentavos: number): ExposicaoDoPedido => ({
  valorComercialCentavos: exposicaoCentavos,
  entradaCentavos: 0,
  financiadoCentavos: exposicaoCentavos,
  exposicaoCreditoCentavos: exposicaoCentavos,
  exposicaoConsignacaoCentavos: 0,
  exposicaoCentavos,
  natureza: 'A_PRAZO',
  consomeLimite: exposicaoCentavos > 0,
  explicacao: '',
});

const troca: ExposicaoDoPedido = {
  valorComercialCentavos: 50_000,
  entradaCentavos: 0,
  financiadoCentavos: 0,
  exposicaoCreditoCentavos: 0,
  exposicaoConsignacaoCentavos: 0,
  exposicaoCentavos: 0,
  natureza: 'SEM_COBRANCA',
  consomeLimite: false,
  explicacao: '',
};

const codigos = (s: SituacaoDeCredito, e: ExposicaoDoPedido) =>
  motivosDaAnalise(s, e).map((m) => m.codigo);

describe('limite e impacto', () => {
  it('utilizacao e comprometido sobre limite; sem limite nao ha percentual', () => {
    expect(utilizacaoDoLimite(820_000, 1_000_000)).toBe(82);
    expect(utilizacaoDoLimite(1, 3)).toBe(33.3);
    expect(utilizacaoDoLimite(100, 0)).toBeNull();
    expect(utilizacaoDoLimite(100, null)).toBeNull();
  });

  it('impacto mostra o antes, o pedido e o depois', () => {
    const impacto = impactoDaAprovacao(situacao(), aPrazo(420_000));
    expect(impacto).toMatchObject({
      limiteCentavos: 1_000_000,
      comprometidoAntesCentavos: 400_000,
      disponivelAntesCentavos: 600_000,
      exposicaoCentavos: 420_000,
      comprometidoDepoisCentavos: 820_000,
      disponivelDepoisCentavos: 180_000,
      utilizacaoAntesPercentual: 40,
      utilizacaoDepoisPercentual: 82,
    });
  });

  it('operacao sem exposicao nao muda o disponivel', () => {
    const impacto = impactoDaAprovacao(situacao(), troca);
    expect(impacto.disponivelDepoisCentavos).toBe(impacto.disponivelAntesCentavos);
    expect(impacto.consomeLimite).toBe(false);
    expect(impacto.valorComercialCentavos).toBe(50_000);
  });
});

describe('motivosDaAnalise', () => {
  it('sem nenhum problema, e analise de rotina e nao fere a politica', () => {
    const motivos = motivosDaAnalise(situacao(), aPrazo(100_000));
    expect(motivos.map((m) => m.codigo)).toEqual(['ANALISE_OBRIGATORIA']);
    expect(violaPolitica(motivos)).toBe(false);
  });

  it('limite insuficiente fere a politica e traz a evidencia', () => {
    const motivos = motivosDaAnalise(situacao(), aPrazo(700_000));
    expect(motivos[0]?.codigo).toBe('LIMITE_INSUFICIENTE');
    expect(motivos[0]?.detalhe).toContain('R$');
    expect(violaPolitica(motivos)).toBe(true);
  });

  it('limite ja estourado antes do pedido e limite excedido', () => {
    expect(codigos(situacao({ comprometidoCentavos: 1_200_000 }), aPrazo(1))).toContain(
      'LIMITE_EXCEDIDO',
    );
  });

  it('sem cadastro ou com limite zero, nao ha limite de credito', () => {
    expect(codigos(situacao({ limiteCentavos: null }), aPrazo(1))).toContain(
      'SEM_LIMITE_DE_CREDITO',
    );
    expect(codigos(situacao({ limiteCentavos: 0 }), aPrazo(1))).toContain('SEM_LIMITE_DE_CREDITO');
  });

  it('titulo vencido dentro da tolerancia e alerta; acima, fere a politica', () => {
    const dentro = motivosDaAnalise(
      situacao({ titulosVencidos: 1, diasDeAtrasoMaximo: 1 }),
      aPrazo(100),
    );
    expect(dentro.find((m) => m.codigo === 'TITULO_VENCIDO')?.violaPolitica).toBe(false);

    const acima = motivosDaAnalise(
      situacao({
        titulosVencidos: 1,
        diasDeAtrasoMaximo: 18,
        inadimplencia: { bloqueia: true, motivo: 'ATRASO', mensagem: '' },
      }),
      aPrazo(100),
    );
    const vencido = acima.find((m) => m.codigo === 'TITULO_VENCIDO');
    expect(vencido?.violaPolitica).toBe(true);
    expect(vencido?.detalhe).toContain('18 dias');
  });

  it('cliente bloqueado fere a politica so quando o pedido concede credito', () => {
    const bloqueado = situacao({ bloqueado: true });
    expect(violaPolitica(motivosDaAnalise(bloqueado, aPrazo(100)))).toBe(true);
    const naTroca = motivosDaAnalise(bloqueado, troca);
    expect(naTroca.map((m) => m.codigo)).toContain('CLIENTE_BLOQUEADO');
    expect(violaPolitica(naTroca)).toBe(false);
  });

  it('troca de cliente sem limite nao fala de limite', () => {
    expect(codigos(situacao({ limiteCentavos: null }), troca)).not.toContain(
      'SEM_LIMITE_DE_CREDITO',
    );
  });

  it('cliente sem titulo nenhum e "sem historico de credito", e nao "bom pagador"', () => {
    const motivos = motivosDaAnalise(
      situacao({ possuiTitulos: false, titulosLiquidados: 0 }),
      aPrazo(100),
    );
    expect(motivos.find((m) => m.codigo === 'SEM_HISTORICO_DE_CREDITO')).toMatchObject({
      rotulo: 'Sem histórico de crédito',
      detalhe: 'Sem títulos anteriores: não há histórico de pagamento a prazo.',
      violaPolitica: false,
    });
    expect(motivos.map((m) => m.codigo)).not.toContain('ANALISE_OBRIGATORIA');
  });

  it.each([0, 1, 2, 3, 4])('%i titulos liquidados: historico insuficiente', (liquidados) => {
    const motivos = motivosDaAnalise(situacao({ titulosLiquidados: liquidados }), aPrazo(100));
    const encontrado = motivos.find((m) => m.codigo === 'HISTORICO_INSUFICIENTE');
    expect(encontrado?.violaPolitica).toBe(false);
    expect(encontrado?.detalhe).toContain('histórico ainda insuficiente');
    expect(encontrado?.detalhe).not.toMatch(/bom|ótimo|sem risco|confiável/i);
  });

  it('5 titulos liquidados: historico suficiente', () => {
    expect(codigos(situacao({ titulosLiquidados: 5 }), aPrazo(100))).not.toContain(
      'HISTORICO_INSUFICIENTE',
    );
  });

  it('o texto do limiar cita a contagem e a regra', () => {
    const encontrado = motivosDaAnalise(situacao({ titulosLiquidados: 2 }), aPrazo(100)).find(
      (m) => m.codigo === 'HISTORICO_INSUFICIENTE',
    );
    expect(encontrado?.detalhe).toBe(
      '2 títulos liquidados — histórico ainda insuficiente (o mínimo é 5).',
    );
  });

  it('pouca amostra e historico insuficiente, com o limiar configuravel', () => {
    const poucos = situacao({ titulosLiquidados: 2 });
    expect(codigos(poucos, aPrazo(100))).toContain('HISTORICO_INSUFICIENTE');
    const detalhe = motivosDaAnalise(poucos, aPrazo(100)).find(
      (m) => m.codigo === 'HISTORICO_INSUFICIENTE',
    )?.detalhe;
    expect(detalhe).toContain('2 títulos liquidados');
    expect(
      motivosDaAnalise(poucos, aPrazo(100), {
        ...PARAMETROS_PADRAO,
        minimoDeTitulosLiquidados: 2,
      }).map((m) => m.codigo),
    ).not.toContain('HISTORICO_INSUFICIENTE');
  });

  it('cadastro incompleto e alerta, nunca bloqueio', () => {
    const motivos = motivosDaAnalise(
      situacao({ cadastro: { existe: true, faltando: ['telefone'] } }),
      aPrazo(100),
    );
    const cadastro = motivos.find((m) => m.codigo === 'CADASTRO_INCOMPLETO');
    expect(cadastro?.detalhe).toContain('telefone');
    expect(cadastro?.violaPolitica).toBe(false);
  });
});

describe('avaliarLote', () => {
  it('consome o limite do mais antigo para o mais recente', () => {
    const lote = avaliarLote(situacao(), [
      { pedidoId: 'b', enviadoEm: '2026-09-13T10:00:00Z', exposicao: aPrazo(400_000) },
      { pedidoId: 'a', enviadoEm: '2026-09-12T10:00:00Z', exposicao: aPrazo(400_000) },
    ]);
    expect(lote.itens.map((i) => [i.pedidoId, i.violaPolitica])).toEqual([
      ['a', false],
      ['b', true],
    ]);
    expect(lote.excepcionais).toEqual(['b']);
    expect(lote.exposicaoCentavos).toBe(800_000);
    expect(lote.disponivelDepoisCentavos).toBe(-200_000);
    expect(lote.utilizacaoDepoisPercentual).toBe(120);
    expect(lote.itens[1]?.impacto.comprometidoAntesCentavos).toBe(800_000);
  });

  it('valor comercial e impacto em credito sao somados separados', () => {
    const lote = avaliarLote(situacao(), [
      { pedidoId: 'a', enviadoEm: '2026-09-12T10:00:00Z', exposicao: aPrazo(100_000) },
      { pedidoId: 't', enviadoEm: '2026-09-12T11:00:00Z', exposicao: troca },
    ]);
    expect(lote.valorComercialCentavos).toBe(150_000);
    expect(lote.exposicaoCentavos).toBe(100_000);
  });
});

describe('justificativa', () => {
  it('exige texto de verdade', () => {
    expect(justificativaValida('ok')).toBe(false);
    expect(justificativaValida('   ')).toBe(false);
    expect(justificativaValida(null)).toBe(false);
    expect(justificativaValida('Cliente quitou o vencido hoje por PIX.')).toBe(true);
  });
});
