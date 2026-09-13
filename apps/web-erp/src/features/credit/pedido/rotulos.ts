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
  EDITADO: 'Pedido editado',
  IMPRESSO: 'Pedido impresso',
  OBSERVACAO: 'Observação adicionada',
  LIBERADO: 'Liberado no crédito',
  REPROVADO: 'Reprovado no crédito',
  FATURADO: 'Faturado',
  EM_ROTA: 'Saiu em rota de entrega',
  ENTREGUE: 'Entrega confirmada',
};

/** Os marcos do caminho do pedido, na ordem em que acontecem. O historico mostra
 *  os que ja passaram e deixa os que faltam a vista — da para ver em que ponto
 *  o pedido esta sem ler a lista inteira. */
export const MARCOS: ReadonlyArray<{ readonly tipo: TipoDeEvento; readonly rotulo: string }> = [
  { tipo: 'LANCADO', rotulo: 'Lançado' },
  { tipo: 'LIBERADO', rotulo: 'Crédito' },
  { tipo: 'FATURADO', rotulo: 'Faturado' },
  { tipo: 'EM_ROTA', rotulo: 'Em rota' },
  { tipo: 'ENTREGUE', rotulo: 'Entregue' },
];

export interface Marco {
  readonly tipo: TipoDeEvento;
  readonly rotulo: string;
  readonly evento: EventoDoPedido | null;
}

/** Cada marco com o evento que o cumpriu, ou nulo se ainda nao aconteceu. */
export const marcosDoPedido = (historico: readonly EventoDoPedido[]): readonly Marco[] =>
  MARCOS.map((marco) => ({
    ...marco,
    evento: [...historico].reverse().find((evento) => evento.tipo === marco.tipo) ?? null,
  }));

/** Do mais recente para o mais antigo: o que aconteceu por ultimo e o que se
 *  procura primeiro. */
export const eventosEmOrdem = (historico: readonly EventoDoPedido[]): readonly EventoDoPedido[] =>
  [...historico].sort((a, b) => b.em.localeCompare(a.em));
