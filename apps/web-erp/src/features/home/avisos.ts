/** Avisos da tela inicial, montados so a partir de dados que a API devolve.
 *  Funcoes puras: a tela decide de onde buscar, aqui so se decide o que mostrar. */

export interface ResumoDoPainel {
  readonly ready: boolean;
  readonly message?: string;
  readonly branches: ReadonlyArray<{
    readonly branchId: string;
    readonly receivableCentavos?: number;
    readonly overdueCentavos?: number;
  }>;
  readonly stock: ReadonlyArray<{
    readonly branchId: string;
    readonly available: number;
    readonly outOfStock: number;
  }>;
}

export interface LoteVencendo {
  readonly lot: {
    readonly productId: string;
    readonly branchId: string;
    readonly expiresAt: string;
    readonly physical: number;
  };
  readonly daysUntilExpiry: number;
  readonly alertLevel: string;
}

export type TomDoAviso = 'critico' | 'atencao';

export interface Aviso {
  readonly id: string;
  readonly titulo: string;
  readonly valor: string;
  readonly detalhe: string;
  readonly tom: TomDoAviso;
  readonly caminho: string;
}

export const formatarMoeda = (centavos: number): string =>
  new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(centavos / 100);

const somar = <T>(itens: readonly T[], valor: (item: T) => number | undefined): number =>
  itens.reduce((soma, item) => soma + (valor(item) ?? 0), 0);

const plural = (quantidade: number, singular: string, varios: string) =>
  quantidade === 1 ? singular : varios;

/** Painel ainda calculando (primeiros minutos) nao gera aviso: melhor nada do
 *  que um "R$ 0,00 vencido" que parece boa noticia e nao e. */
export const avisosDoPainel = (
  painel: ResumoDoPainel,
  caminhos: { readonly receber: string; readonly estoque: string },
): Aviso[] => {
  if (!painel.ready) return [];
  const avisos: Aviso[] = [];

  const vencido = somar(painel.branches, (filial) => filial.overdueCentavos);
  const emAberto = somar(painel.branches, (filial) => filial.receivableCentavos);
  if (vencido > 0) {
    avisos.push({
      id: 'receber-vencido',
      titulo: 'Contas a receber vencidas',
      valor: formatarMoeda(vencido),
      detalhe: emAberto > 0 ? `de ${formatarMoeda(emAberto)} em aberto` : 'em aberto',
      tom: 'critico',
      caminho: caminhos.receber,
    });
  }

  const semEstoque = somar(painel.stock, (filial) => filial.outOfStock);
  if (semEstoque > 0) {
    avisos.push({
      id: 'sem-estoque',
      titulo: 'Produtos sem estoque',
      valor: String(semEstoque),
      detalhe: plural(semEstoque, 'produto zerado', 'produtos zerados'),
      tom: 'atencao',
      caminho: caminhos.estoque,
    });
  }
  return avisos;
};

/** Racao e insumo agro vencem: lote vencido e aviso critico, a vencer e atencao. */
export const avisoDeLotes = (lotes: readonly LoteVencendo[], caminho: string): Aviso | null => {
  if (lotes.length === 0) return null;

  const vencidos = lotes.filter((lote) => lote.daysUntilExpiry < 0).length;
  const aVencer = lotes.filter((lote) => lote.daysUntilExpiry >= 0).map((l) => l.daysUntilExpiry);
  const proximo = aVencer.length > 0 ? Math.min(...aVencer) : null;

  const partes = [
    vencidos > 0 ? `${vencidos} ${plural(vencidos, 'já vencido', 'já vencidos')}` : null,
    proximo === 0 ? 'um vence hoje' : null,
    proximo !== null && proximo > 0
      ? `o próximo vence em ${proximo} ${plural(proximo, 'dia', 'dias')}`
      : null,
  ].filter((parte): parte is string => parte !== null);

  return {
    id: 'lotes-vencendo',
    titulo: 'Lotes vencendo em até 90 dias',
    valor: String(lotes.length),
    detalhe: partes.join(' · '),
    tom: vencidos > 0 ? 'critico' : 'atencao',
    caminho,
  };
};

/** MDF-e nao encerrado vira pendencia na SEFAZ (§18). */
export const avisoDeMdfe = (abertos: readonly unknown[], caminho: string): Aviso | null =>
  abertos.length === 0
    ? null
    : {
        id: 'mdfe-aberto',
        titulo: 'MDF-e aberto há mais de 24h',
        valor: String(abertos.length),
        detalhe: 'Encerre para não gerar pendência na SEFAZ',
        tom: 'atencao',
        caminho,
      };

/** Critico primeiro; entre iguais, mantem a ordem de chegada. */
export const ordenarAvisos = (avisos: readonly Aviso[]): Aviso[] =>
  [...avisos].sort((a, b) => Number(b.tom === 'critico') - Number(a.tom === 'critico'));
