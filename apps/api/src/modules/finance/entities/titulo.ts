import { BadRequestException } from '@nestjs/common';
import type {
  DiaProjetado,
  FaixaAgregada,
  FaixaDeVencimento,
  InadimplenciaDoCliente,
  Liquidacao,
  Titulo,
  TituloStatus,
} from '@synapse/types';

const DIA_EM_MS = 86_400_000;

const soData = (iso: string): string => iso.slice(0, 10);

export const diasEntre = (de: string, ate: string): number =>
  Math.round((Date.parse(soData(ate)) - Date.parse(soData(de))) / DIA_EM_MS);

/** O saldo e sempre derivado das liquidacoes, nunca um campo guardado.
 *
 *  Campo guardado e campo que sai do ar: bastaria um caminho de escrita
 *  esquecer de atualiza-lo para o titulo passar a mentir. Somar os movimentos
 *  custa nada e nao tem como divergir. */
export const totalLiquidadoCentavos = (titulo: Titulo): number =>
  titulo.liquidacoes.reduce((soma, l) => soma + l.valorCentavos, 0);

export const saldoCentavos = (titulo: Titulo): number =>
  titulo.valorOriginalCentavos - totalLiquidadoCentavos(titulo);

export const estaQuitado = (titulo: Titulo): boolean => saldoCentavos(titulo) <= 0;

/** Status derivado. RENEGOCIADO e CANCELADO sao decisoes, e nao consequencia do
 *  saldo, entao mandam sobre o resto. */
export const statusDe = (titulo: Titulo, hoje: string): TituloStatus => {
  if (titulo.status === 'CANCELADO' || titulo.status === 'RENEGOCIADO') return titulo.status;
  if (estaQuitado(titulo)) return 'QUITADO';
  if (diasEntre(titulo.vencimento, hoje) > 0) return 'VENCIDO';
  return totalLiquidadoCentavos(titulo) > 0 ? 'PARCIAL' : 'ABERTO';
};

export const diasDeAtraso = (titulo: Titulo, hoje: string): number =>
  estaQuitado(titulo) ? 0 : Math.max(0, diasEntre(titulo.vencimento, hoje));

/** Recebimento parcial (c24-1): acrescenta o movimento e deixa o saldo correto
 *  e rastreavel — quem pagou quanto, quando e por qual meio. */
export const registrarLiquidacao = (
  titulo: Titulo,
  liquidacao: Liquidacao,
  hoje: string,
): Titulo => {
  if (titulo.status === 'CANCELADO') {
    throw new BadRequestException('Título cancelado não recebe liquidação');
  }
  if (titulo.status === 'RENEGOCIADO') {
    throw new BadRequestException(
      'Título renegociado não recebe liquidação: lance no título que o substituiu',
    );
  }
  if (liquidacao.valorCentavos <= 0) {
    throw new BadRequestException('Valor da liquidação deve ser positivo');
  }

  // Pagar mais do que se deve nao e "quitado com sobra": e erro de digitacao na
  // esmagadora maioria das vezes, e devolver o troco depois custa muito mais
  // caro do que recusar agora.
  const saldo = saldoCentavos(titulo);
  if (liquidacao.valorCentavos > saldo) {
    throw new BadRequestException(
      `Liquidação de ${liquidacao.valorCentavos} excede o saldo de ${saldo} centavos`,
    );
  }

  const comMovimento: Titulo = {
    ...titulo,
    liquidacoes: [...titulo.liquidacoes, liquidacao],
  };
  return { ...comMovimento, status: statusDe(comMovimento, hoje) };
};

export interface ParcelaRenegociada {
  readonly id: string;
  readonly valorCentavos: number;
  readonly vencimento: string;
}

/** Renegociacao (c24-2): a divida original **nao** e apagada.
 *
 *  O titulo antigo vira RENEGOCIADO e guarda para onde foi; cada titulo novo
 *  guarda de onde veio. Os dois lados do vinculo ficam gravados, entao a
 *  auditoria consegue reconstruir a historia por qualquer ponta. */
export const renegociar = (
  original: Titulo,
  parcelas: readonly ParcelaRenegociada[],
  agora: string,
  por: Titulo['criadoPor'],
): { readonly original: Titulo; readonly novos: readonly Titulo[] } => {
  if (original.status === 'RENEGOCIADO') {
    throw new BadRequestException('Título já foi renegociado');
  }
  if (original.status === 'CANCELADO') {
    throw new BadRequestException('Título cancelado não pode ser renegociado');
  }
  if (parcelas.length === 0) {
    throw new BadRequestException('A renegociação precisa de ao menos uma parcela');
  }

  const saldo = saldoCentavos(original);
  if (saldo <= 0) throw new BadRequestException('Título sem saldo não precisa de renegociação');

  // O total renegociado pode passar do saldo — juros de renegociacao sao a
  // regra, nao a excecao. Menor que o saldo seria perdao de divida, que e outra
  // operacao e precisa de outra autorizacao.
  const totalNovo = parcelas.reduce((soma, p) => soma + p.valorCentavos, 0);
  if (totalNovo < saldo) {
    throw new BadRequestException(
      `Renegociação de ${totalNovo} é menor que o saldo de ${saldo} centavos: ` +
        `perdão de dívida é outra operação`,
    );
  }
  if (parcelas.some((p) => p.valorCentavos <= 0)) {
    throw new BadRequestException('Toda parcela da renegociação precisa ter valor positivo');
  }

  const novos: Titulo[] = parcelas.map((parcela, indice) => ({
    ...original,
    id: parcela.id,
    valorOriginalCentavos: parcela.valorCentavos,
    vencimento: parcela.vencimento,
    numeroParcela: indice + 1,
    totalDeParcelas: parcelas.length,
    status: 'ABERTO',
    liquidacoes: [],
    descricao: `${original.descricao} (renegociado)`,
    renegociadoDe: original.id,
    renegociadoPara: [],
    criadoEm: agora,
    criadoPor: por,
  }));

  return {
    original: {
      ...original,
      status: 'RENEGOCIADO',
      renegociadoPara: parcelas.map((p) => p.id),
    },
    novos,
  };
};

/** Titulo que ainda pesa no fluxo de caixa. Renegociado sai da conta: quem
 *  responde pelo dinheiro agora sao os titulos que o substituiram — soma-lo
 *  junto contaria a mesma divida duas vezes. */
export const contaNoSaldo = (titulo: Titulo): boolean =>
  titulo.status !== 'CANCELADO' && titulo.status !== 'RENEGOCIADO' && !estaQuitado(titulo);

export const faixaDe = (titulo: Titulo, hoje: string): FaixaDeVencimento => {
  const dias = diasEntre(hoje, titulo.vencimento);
  if (dias < 0) return 'VENCIDOS';
  if (dias === 0) return 'HOJE';
  if (dias <= 7) return 'ATE_7_DIAS';
  if (dias <= 30) return 'ATE_30_DIAS';
  return 'DEPOIS';
};

const FAIXAS: readonly FaixaDeVencimento[] = [
  'VENCIDOS',
  'HOJE',
  'ATE_7_DIAS',
  'ATE_30_DIAS',
  'DEPOIS',
];

/** Dashboard do §24 (c24-3): hoje · 7 dias · 30 dias · vencidos. */
export const agruparPorFaixa = (
  titulos: readonly Titulo[],
  hoje: string,
): readonly FaixaAgregada[] => {
  // Record indexado pela uniao, e nao Map: toda faixa existe por construcao,
  // entao a leitura nao devolve undefined e nao precisa de assert.
  const porFaixa: Record<FaixaDeVencimento, { quantidade: number; saldoCentavos: number }> = {
    VENCIDOS: { quantidade: 0, saldoCentavos: 0 },
    HOJE: { quantidade: 0, saldoCentavos: 0 },
    ATE_7_DIAS: { quantidade: 0, saldoCentavos: 0 },
    ATE_30_DIAS: { quantidade: 0, saldoCentavos: 0 },
    DEPOIS: { quantidade: 0, saldoCentavos: 0 },
  };

  for (const titulo of titulos.filter(contaNoSaldo)) {
    const acumulado = porFaixa[faixaDe(titulo, hoje)];
    acumulado.quantidade += 1;
    acumulado.saldoCentavos += saldoCentavos(titulo);
  }

  return FAIXAS.map((faixa) => ({ faixa, ...porFaixa[faixa] }));
};

/** Inadimplencia por cliente (c24-4). */
export const inadimplenciaPorCliente = (
  titulos: readonly Titulo[],
  hoje: string,
): readonly InadimplenciaDoCliente[] => {
  const porCliente = new Map<string, { titulos: number; saldo: number; atraso: number }>();

  for (const titulo of titulos) {
    if (titulo.tipo !== 'RECEBER' || !titulo.customerId) continue;
    if (!contaNoSaldo(titulo)) continue;
    const atraso = diasDeAtraso(titulo, hoje);
    if (atraso <= 0) continue;

    const atual = porCliente.get(titulo.customerId) ?? { titulos: 0, saldo: 0, atraso: 0 };
    porCliente.set(titulo.customerId, {
      titulos: atual.titulos + 1,
      saldo: atual.saldo + saldoCentavos(titulo),
      atraso: Math.max(atual.atraso, atraso),
    });
  }

  return [...porCliente.entries()]
    .map(([customerId, dados]) => ({
      customerId: customerId as InadimplenciaDoCliente['customerId'],
      titulosVencidos: dados.titulos,
      saldoVencidoCentavos: dados.saldo,
      diasDeAtrasoMaximo: dados.atraso,
    }))
    .sort((a, b) => b.saldoVencidoCentavos - a.saldoVencidoCentavos);
};

/** Fluxo de caixa projetado (c24-7): entradas e saidas dia a dia, do saldo
 *  inicial em diante. Projeta pelo vencimento — e uma previsao, nao um extrato. */
export const projetarFluxoDeCaixa = (
  titulos: readonly Titulo[],
  de: string,
  ate: string,
  saldoInicialCentavos: number,
): readonly DiaProjetado[] => {
  const dias = diasEntre(de, ate);
  if (dias < 0) throw new BadRequestException('Data final anterior à inicial');

  const porDia = new Map<string, { entradas: number; saidas: number }>();
  for (let i = 0; i <= dias; i += 1) {
    porDia.set(new Date(Date.parse(soData(de)) + i * DIA_EM_MS).toISOString().slice(0, 10), {
      entradas: 0,
      saidas: 0,
    });
  }

  for (const titulo of titulos.filter(contaNoSaldo)) {
    const dia = porDia.get(soData(titulo.vencimento));
    if (!dia) continue;
    if (titulo.tipo === 'RECEBER') dia.entradas += saldoCentavos(titulo);
    else dia.saidas += saldoCentavos(titulo);
  }

  let acumulado = saldoInicialCentavos;
  return [...porDia.entries()].map(([data, { entradas, saidas }]) => {
    acumulado += entradas - saidas;
    return {
      data,
      entradasCentavos: entradas,
      saidasCentavos: saidas,
      saldoAcumuladoCentavos: acumulado,
    };
  });
};
