import type { EtapaDoPedido, EventoDoPedido, TipoDeEvento } from '@synapse/types';

export const ROTULO_DA_ETAPA: Record<EtapaDoPedido, string> = {
  VENDEDOR: 'Vendedor',
  GERENCIA_COMERCIAL: 'Gerência comercial',
  CREDITO: 'Crédito',
  FATURAMENTO: 'Faturamento',
  EXPEDICAO: 'Expedição',
};

export const ROTULO_DO_EVENTO: Record<TipoDeEvento, string> = {
  LANCADO: 'Pedido lançado',
  ANALISE_ACIONADA: 'Análise acionada',
  EDITADO: 'Pedido editado',
  IMPRESSO: 'Pedido impresso',
  VISUALIZADO: 'Pedido visualizado',
  OBSERVACAO: 'Observação adicionada',
  LIBERADO: 'Pedido aprovado',
  LIBERADO_EXCECAO: 'Aprovado fora da política',
  REPROVADO: 'Pedido reprovado',
  FATURADO: 'Faturado',
  EM_ROTA: 'Saiu em rota de entrega',
  ENTREGUE: 'Entrega confirmada',
};

/** Os marcos do caminho do pedido, na ordem em que acontecem. O credito se
 *  cumpre com qualquer decisao: aprovado, aprovado por excecao ou reprovado. */
export const MARCOS: ReadonlyArray<{
  readonly tipos: readonly TipoDeEvento[];
  readonly rotulo: string;
}> = [
  { tipos: ['LANCADO'], rotulo: 'Lançado' },
  { tipos: ['LIBERADO', 'LIBERADO_EXCECAO', 'REPROVADO'], rotulo: 'Crédito' },
  { tipos: ['FATURADO'], rotulo: 'Faturado' },
  { tipos: ['EM_ROTA'], rotulo: 'Em rota' },
  { tipos: ['ENTREGUE'], rotulo: 'Entregue' },
];

export interface Marco {
  readonly rotulo: string;
  readonly evento: EventoDoPedido | null;
}

/** Cada marco com o evento que o cumpriu, ou nulo se ainda nao aconteceu. */
export const marcosDoPedido = (historico: readonly EventoDoPedido[]): readonly Marco[] =>
  MARCOS.map((marco) => ({
    rotulo: marco.rotulo,
    evento: [...historico].reverse().find((evento) => marco.tipos.includes(evento.tipo)) ?? null,
  }));

/** Do mais recente para o mais antigo: o que aconteceu por ultimo e o que se
 *  procura primeiro. */
export const eventosEmOrdem = (historico: readonly EventoDoPedido[]): readonly EventoDoPedido[] =>
  [...historico].sort((a, b) => b.em.localeCompare(a.em));
