import type { CustomerId, Periodicidade, Recorrencia, Titulo } from '@synapse/types';
import { contaNoSaldo, diasDeAtraso, saldoCentavos } from './titulo';

/** Regra de bloqueio por inadimplencia (c24-8), por tenant.
 *
 *  `diasDeToleranciaAtraso` existe porque boleto compensa em D+1: bloquear no
 *  primeiro dia de atraso barraria cliente que ja pagou e o banco ainda nao
 *  avisou. */
export interface PoliticaDeCredito {
  readonly bloquearInadimplente: boolean;
  readonly diasDeToleranciaAtraso: number;
  /** 0 desliga o limite por valor. */
  readonly limiteDeSaldoVencidoCentavos: number;
}

export const POLITICA_PADRAO: PoliticaDeCredito = {
  bloquearInadimplente: true,
  diasDeToleranciaAtraso: 2,
  limiteDeSaldoVencidoCentavos: 0,
};

export type MotivoDoBloqueio = 'ATRASO' | 'LIMITE_DE_SALDO_VENCIDO';

export type AvaliacaoDeCredito =
  | { readonly liberado: true }
  | {
      readonly liberado: false;
      readonly motivo: MotivoDoBloqueio;
      readonly saldoVencidoCentavos: number;
      readonly diasDeAtrasoMaximo: number;
      readonly mensagem: string;
    };

const LIBERADO: AvaliacaoDeCredito = { liberado: true };

/** Diz se o cliente pode comprar a prazo, e por que nao quando nao pode.
 *
 *  Devolve o motivo em vez de um booleano: o vendedor precisa saber o que
 *  falar para o cliente, e o gerente precisa saber o que liberar. */
export const avaliarCredito = (
  customerId: CustomerId,
  titulos: readonly Titulo[],
  politica: PoliticaDeCredito,
  hoje: string,
): AvaliacaoDeCredito => {
  if (!politica.bloquearInadimplente) return LIBERADO;

  const vencidos = titulos.filter(
    (titulo) =>
      titulo.tipo === 'RECEBER' &&
      titulo.customerId === customerId &&
      contaNoSaldo(titulo) &&
      diasDeAtraso(titulo, hoje) > 0,
  );
  if (vencidos.length === 0) return LIBERADO;

  const saldoVencidoCentavos = vencidos.reduce((soma, t) => soma + saldoCentavos(t), 0);
  const diasDeAtrasoMaximo = Math.max(...vencidos.map((t) => diasDeAtraso(t, hoje)));

  if (diasDeAtrasoMaximo > politica.diasDeToleranciaAtraso) {
    return {
      liberado: false,
      motivo: 'ATRASO',
      saldoVencidoCentavos,
      diasDeAtrasoMaximo,
      mensagem:
        `Cliente com ${vencidos.length} título(s) vencido(s), ` +
        `o mais antigo há ${diasDeAtrasoMaximo} dias.`,
    };
  }

  if (
    politica.limiteDeSaldoVencidoCentavos > 0 &&
    saldoVencidoCentavos > politica.limiteDeSaldoVencidoCentavos
  ) {
    return {
      liberado: false,
      motivo: 'LIMITE_DE_SALDO_VENCIDO',
      saldoVencidoCentavos,
      diasDeAtrasoMaximo,
      mensagem:
        `Saldo vencido de ${saldoVencidoCentavos} centavos passa do limite de ` +
        `${politica.limiteDeSaldoVencidoCentavos}.`,
    };
  }

  return LIBERADO;
};

const PASSO_EM_DIAS: Readonly<Record<Exclude<Periodicidade, 'MENSAL' | 'ANUAL'>, number>> = {
  SEMANAL: 7,
  QUINZENAL: 15,
};

/** Mes que nao tem o dia 31 recebe o ultimo dia do mes, e nao 1º do seguinte:
 *  aluguel que vence dia 31 vence dia 28 em fevereiro, nao dia 3 de marco. */
const noMes = (ano: number, mes: number, dia: number): string => {
  const ultimoDia = new Date(Date.UTC(ano, mes + 1, 0)).getUTCDate();
  return new Date(Date.UTC(ano, mes, Math.min(dia, ultimoDia))).toISOString().slice(0, 10);
};

/** Vencimentos de uma recorrencia dentro da janela (c24-5). */
export const vencimentosDaRecorrencia = (
  recorrencia: Recorrencia,
  de: string,
  ate: string,
): readonly string[] => {
  if (!recorrencia.ativa) return [];

  const inicio = recorrencia.inicio > de ? recorrencia.inicio : de;
  const fim = recorrencia.fim && recorrencia.fim < ate ? recorrencia.fim : ate;
  if (inicio > fim) return [];

  const datas: string[] = [];

  if (recorrencia.periodicidade === 'MENSAL' || recorrencia.periodicidade === 'ANUAL') {
    const passoEmMeses = recorrencia.periodicidade === 'MENSAL' ? 1 : 12;
    const primeiro = new Date(`${inicio}T00:00:00.000Z`);
    let ano = primeiro.getUTCFullYear();
    let mes = primeiro.getUTCMonth();

    for (let i = 0; i < 240; i += 1) {
      const data = noMes(ano, mes, recorrencia.diaDoVencimento);
      if (data > fim) break;
      if (data >= inicio) datas.push(data);
      mes += passoEmMeses;
      ano += Math.floor(mes / 12);
      mes %= 12;
    }
    return datas;
  }

  const passo = PASSO_EM_DIAS[recorrencia.periodicidade];
  for (let t = Date.parse(inicio); t <= Date.parse(fim); t += passo * 86_400_000) {
    datas.push(new Date(t).toISOString().slice(0, 10));
  }
  return datas;
};
