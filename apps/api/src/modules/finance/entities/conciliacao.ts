import { BadRequestException } from '@nestjs/common';
import type { BankTransaction, Titulo, UserId } from '@synapse/types';
import { contaNoSaldo, diasEntre, saldoCentavos } from './titulo';

/** Como o lancamento foi casado com o titulo. A ordem e a da confianca:
 *  identificador e certeza, valor+data e inferencia, manual e decisao humana. */
export type CriterioDaConciliacao = 'IDENTIFICADOR' | 'VALOR_E_DATA' | 'MANUAL';

export type SituacaoDaConciliacao = 'CONCILIADO' | 'PENDENTE' | 'DIVERGENTE';

export interface ItemConciliado {
  readonly lancamentoId: string;
  readonly tituloId: string;
  readonly criterio: CriterioDaConciliacao;
  readonly valorCentavos: number;
  readonly conciliadoPor: UserId | null;
  readonly conciliadoEm: string;
}

/** O que sobrou de um dos lados e ainda espera alguem resolver.
 *
 *  Existe como registro, e nao como ausencia: diferenca que some da tela e
 *  diferenca que ninguem investiga. */
export interface Pendencia {
  readonly id: string;
  readonly lado: 'BANCO' | 'SISTEMA';
  readonly lancamentoId: string | null;
  readonly tituloId: string | null;
  readonly valorCentavos: number;
  readonly data: string;
  readonly descricao: string;
  readonly situacao: SituacaoDaConciliacao;
  readonly motivoDaDivergencia: string | null;
  readonly marcadoPor: UserId | null;
}

export interface ResultadoDaConciliacao {
  readonly conciliados: readonly ItemConciliado[];
  readonly pendencias: readonly Pendencia[];
}

export interface OpcoesDaConciliacao {
  /** Tolerancia de dias entre a data do banco e o vencimento do titulo. Boleto
   *  compensa em D+1 ou D+2, entao exigir a data exata nao casaria quase nada. */
  readonly toleranciaEmDias: number;
}

export const OPCOES_PADRAO: OpcoesDaConciliacao = { toleranciaEmDias: 3 };

const pendenciaDoBanco = (lancamento: BankTransaction): Pendencia => ({
  id: `banco:${lancamento.id}`,
  lado: 'BANCO',
  lancamentoId: lancamento.id,
  tituloId: null,
  valorCentavos: lancamento.valorCentavos,
  data: lancamento.data,
  descricao: lancamento.descricao,
  situacao: 'PENDENTE',
  motivoDaDivergencia: null,
  marcadoPor: null,
});

const pendenciaDoSistema = (titulo: Titulo): Pendencia => ({
  id: `sistema:${titulo.id}`,
  lado: 'SISTEMA',
  lancamentoId: null,
  tituloId: titulo.id,
  valorCentavos: saldoCentavos(titulo),
  data: titulo.vencimento,
  descricao: titulo.descricao,
  situacao: 'PENDENTE',
  motivoDaDivergencia: null,
  marcadoPor: null,
});

/** Conciliacao automatica (c25-1).
 *
 *  Duas passadas, e nao uma: o identificador que o banco devolve e o que
 *  mandamos no titulo, entao ele e certeza. Casar por valor e data e palpite —
 *  duas contas de R$ 500 no mesmo dia sao indistinguiveis. Rodar o palpite
 *  antes gastaria um lancamento certo num casamento errado.
 *
 *  Por isso o valor+data so casa quando a combinacao e **unica** dos dois lados. */
export const conciliarAutomatico = (
  lancamentos: readonly BankTransaction[],
  titulos: readonly Titulo[],
  agora: string,
  opcoes: OpcoesDaConciliacao = OPCOES_PADRAO,
): ResultadoDaConciliacao => {
  const abertos = titulos.filter(contaNoSaldo);
  const conciliados: ItemConciliado[] = [];
  const lancamentosUsados = new Set<string>();
  const titulosUsados = new Set<string>();

  const porReferencia = new Map<string, Titulo>();
  for (const titulo of abertos) porReferencia.set(titulo.id, titulo);

  // 1ª passada: identificador.
  for (const lancamento of lancamentos) {
    if (!lancamento.referencia) continue;
    const titulo = porReferencia.get(lancamento.referencia);
    if (!titulo || titulosUsados.has(titulo.id)) continue;

    conciliados.push({
      lancamentoId: lancamento.id,
      tituloId: titulo.id,
      criterio: 'IDENTIFICADOR',
      valorCentavos: lancamento.valorCentavos,
      conciliadoPor: null,
      conciliadoEm: agora,
    });
    lancamentosUsados.add(lancamento.id);
    titulosUsados.add(titulo.id);
  }

  // 2ª passada: valor e data, e so quando nao ha ambiguidade.
  for (const lancamento of lancamentos) {
    if (lancamentosUsados.has(lancamento.id)) continue;

    const candidatos = abertos.filter(
      (titulo) =>
        !titulosUsados.has(titulo.id) &&
        saldoCentavos(titulo) === lancamento.valorCentavos &&
        Math.abs(diasEntre(titulo.vencimento, lancamento.data)) <= opcoes.toleranciaEmDias,
    );

    // Mais de um candidato: escolher no chute erraria em silencio. Fica pendente
    // para alguem decidir, que e o que a conciliacao manual existe para fazer.
    if (candidatos.length !== 1) continue;
    const titulo = candidatos[0];
    if (!titulo) continue;

    const outrosLancamentosIguais = lancamentos.filter(
      (outro) =>
        !lancamentosUsados.has(outro.id) &&
        outro.valorCentavos === lancamento.valorCentavos &&
        Math.abs(diasEntre(titulo.vencimento, outro.data)) <= opcoes.toleranciaEmDias,
    );
    if (outrosLancamentosIguais.length !== 1) continue;

    conciliados.push({
      lancamentoId: lancamento.id,
      tituloId: titulo.id,
      criterio: 'VALOR_E_DATA',
      valorCentavos: lancamento.valorCentavos,
      conciliadoPor: null,
      conciliadoEm: agora,
    });
    lancamentosUsados.add(lancamento.id);
    titulosUsados.add(titulo.id);
  }

  // c25-3: o que sobrou dos dois lados vira pendencia registrada.
  const pendencias: Pendencia[] = [
    ...lancamentos.filter((l) => !lancamentosUsados.has(l.id)).map(pendenciaDoBanco),
    ...abertos.filter((t) => !titulosUsados.has(t.id)).map(pendenciaDoSistema),
  ];

  return { conciliados, pendencias };
};

/** Conciliacao manual (c25-2). Guarda quem decidiu — sem isso nao ha auditoria
 *  do que foi casado na mao (c25-6). */
export const conciliarManual = (
  pendencias: readonly Pendencia[],
  lancamentoId: string,
  tituloId: string,
  por: UserId,
  agora: string,
): { readonly item: ItemConciliado; readonly pendencias: readonly Pendencia[] } => {
  const doBanco = pendencias.find((p) => p.lancamentoId === lancamentoId && p.lado === 'BANCO');
  const doSistema = pendencias.find((p) => p.tituloId === tituloId && p.lado === 'SISTEMA');

  if (!doBanco) throw new BadRequestException(`Lançamento ${lancamentoId} não está pendente`);
  if (!doSistema) throw new BadRequestException(`Título ${tituloId} não está pendente`);

  return {
    item: {
      lancamentoId,
      tituloId,
      criterio: 'MANUAL',
      valorCentavos: doBanco.valorCentavos,
      conciliadoPor: por,
      conciliadoEm: agora,
    },
    pendencias: pendencias.filter((p) => p.id !== doBanco.id && p.id !== doSistema.id),
  };
};

/** Marcar divergencia (c25-4). A pendencia NAO sai da lista: muda de situacao e
 *  ganha o motivo. Tirar da lista e o mesmo que esconder o problema. */
export const marcarDivergencia = (
  pendencias: readonly Pendencia[],
  pendenciaId: string,
  motivo: string,
  por: UserId,
): readonly Pendencia[] => {
  if (!motivo.trim()) throw new BadRequestException('Divergência precisa de um motivo');
  if (!pendencias.some((p) => p.id === pendenciaId)) {
    throw new BadRequestException(`Pendência ${pendenciaId} não encontrada`);
  }

  return pendencias.map((pendencia) =>
    pendencia.id === pendenciaId
      ? {
          ...pendencia,
          situacao: 'DIVERGENTE',
          motivoDaDivergencia: motivo.trim(),
          marcadoPor: por,
        }
      : pendencia,
  );
};

export interface RelatorioDeConciliacao {
  readonly de: string;
  readonly ate: string;
  readonly conciliadosPorIdentificador: number;
  readonly conciliadosPorValorEData: number;
  readonly conciliadosManualmente: number;
  readonly totalConciliadoCentavos: number;
  readonly pendentesNoBanco: number;
  readonly pendentesNoSistema: number;
  readonly divergentes: number;
  readonly saldoPendenteCentavos: number;
}

/** Relatorio por periodo (c25-5). */
export const relatorioDeConciliacao = (
  resultado: ResultadoDaConciliacao,
  de: string,
  ate: string,
): RelatorioDeConciliacao => {
  const porCriterio = (criterio: CriterioDaConciliacao) =>
    resultado.conciliados.filter((c) => c.criterio === criterio).length;

  const emAberto = resultado.pendencias.filter((p) => p.situacao !== 'CONCILIADO');

  return {
    de,
    ate,
    conciliadosPorIdentificador: porCriterio('IDENTIFICADOR'),
    conciliadosPorValorEData: porCriterio('VALOR_E_DATA'),
    conciliadosManualmente: porCriterio('MANUAL'),
    totalConciliadoCentavos: resultado.conciliados.reduce((s, c) => s + c.valorCentavos, 0),
    pendentesNoBanco: emAberto.filter((p) => p.lado === 'BANCO').length,
    pendentesNoSistema: emAberto.filter((p) => p.lado === 'SISTEMA').length,
    divergentes: emAberto.filter((p) => p.situacao === 'DIVERGENTE').length,
    saldoPendenteCentavos: emAberto.reduce((s, p) => s + p.valorCentavos, 0),
  };
};
