import {
  avisoDeLotes,
  avisoDeMdfe,
  avisosDoPainel,
  formatarMoeda,
  ordenarAvisos,
  type LoteVencendo,
  type ResumoDoPainel,
} from './avisos';

const CAMINHOS = { receber: '/financeiro/boletos', estoque: '/estoque' };

const painel = (extra: Partial<ResumoDoPainel> = {}): ResumoDoPainel => ({
  ready: true,
  branches: [],
  stock: [],
  ...extra,
});

const lote = (dias: number): LoteVencendo => ({
  lot: { productId: 'p', branchId: 'matriz', expiresAt: '2026-10-01', physical: 10 },
  daysUntilExpiry: dias,
  alertLevel: dias < 0 ? 'EXPIRED' : 'D30',
});

const semEspacoRaro = (texto: string) => texto.replace(/\s/g, ' ');

describe('avisosDoPainel', () => {
  it('soma o vencido de todas as filiais e mostra o total em aberto', () => {
    const [aviso] = avisosDoPainel(
      painel({
        branches: [
          { branchId: 'a', overdueCentavos: 10_000, receivableCentavos: 50_000 },
          { branchId: 'b', overdueCentavos: 5_050, receivableCentavos: 20_000 },
        ],
      }),
      CAMINHOS,
    );

    expect(aviso).toMatchObject({
      id: 'receber-vencido',
      tom: 'critico',
      caminho: '/financeiro/boletos',
    });
    expect(semEspacoRaro(aviso?.valor ?? '')).toBe('R$ 150,50');
    expect(semEspacoRaro(aviso?.detalhe ?? '')).toBe('de R$ 700,00 em aberto');
  });

  it('conta produtos zerados de todas as filiais', () => {
    const [aviso] = avisosDoPainel(
      painel({
        stock: [
          { branchId: 'a', available: 3, outOfStock: 2 },
          { branchId: 'b', available: 1, outOfStock: 1 },
        ],
      }),
      CAMINHOS,
    );
    expect(aviso).toMatchObject({
      id: 'sem-estoque',
      valor: '3',
      detalhe: 'produtos zerados',
      tom: 'atencao',
    });
  });

  it('nao gera aviso quando esta tudo em dia', () => {
    const avisos = avisosDoPainel(
      painel({
        branches: [{ branchId: 'a', overdueCentavos: 0, receivableCentavos: 900 }],
        stock: [{ branchId: 'a', available: 9, outOfStock: 0 }],
      }),
      CAMINHOS,
    );
    expect(avisos).toEqual([]);
  });

  // "R$ 0,00 vencido" enquanto o painel calcula pareceria boa noticia.
  it('nao gera aviso enquanto o painel ainda calcula', () => {
    expect(
      avisosDoPainel(
        painel({ ready: false, branches: [{ branchId: 'a', overdueCentavos: 999 }] }),
        CAMINHOS,
      ),
    ).toEqual([]);
  });
});

describe('avisoDeLotes', () => {
  it('sem lote, sem aviso', () => {
    expect(avisoDeLotes([], '/estoque')).toBeNull();
  });

  it('lote a vencer e atencao e diz quando vence o proximo', () => {
    expect(avisoDeLotes([lote(12), lote(5)], '/estoque')).toMatchObject({
      valor: '2',
      detalhe: 'o próximo vence em 5 dias',
      tom: 'atencao',
    });
  });

  it('lote vencido torna o aviso critico', () => {
    expect(avisoDeLotes([lote(-3), lote(-1), lote(1)], '/estoque')).toMatchObject({
      valor: '3',
      detalhe: '2 já vencidos · o próximo vence em 1 dia',
      tom: 'critico',
    });
  });

  it('avisa lote que vence hoje', () => {
    expect(avisoDeLotes([lote(0)], '/estoque')?.detalhe).toBe('um vence hoje');
  });
});

describe('avisoDeMdfe', () => {
  it('so avisa quando ha manifesto aberto', () => {
    expect(avisoDeMdfe([], '/x')).toBeNull();
    expect(avisoDeMdfe([{}, {}], '/x')).toMatchObject({
      valor: '2',
      tom: 'atencao',
      caminho: '/x',
    });
  });
});

describe('ordenarAvisos', () => {
  it('poe critico antes de atencao e mantem a ordem entre iguais', () => {
    const base = { titulo: '', valor: '', detalhe: '', caminho: '/' };
    const ordem = ordenarAvisos([
      { ...base, id: 'a1', tom: 'atencao' },
      { ...base, id: 'c1', tom: 'critico' },
      { ...base, id: 'a2', tom: 'atencao' },
      { ...base, id: 'c2', tom: 'critico' },
    ]).map((aviso) => aviso.id);
    expect(ordem).toEqual(['c1', 'c2', 'a1', 'a2']);
  });
});

describe('formatarMoeda', () => {
  it('formata centavos em reais', () => {
    expect(semEspacoRaro(formatarMoeda(123_456))).toBe('R$ 1.234,56');
  });
});
