import type { DetalheDoPedido, EventoDoPedido, TipoDeEvento } from '@synapse/types';

/** O caminho do pedido, do lancamento a entrega, montado so com o que foi
 *  registrado: etapa sem registro fica "aguardando", e nada e deduzido. */

export interface PassoDoPedido {
  readonly id: string;
  readonly rotulo: string;
  readonly em: string | null;
  readonly autor: string | null;
  readonly detalhe: string | null;
  readonly feito: boolean;
  /** Reprovado e cancelado encerram o caminho. */
  readonly final?: 'reprovado' | 'cancelado';
}

const ultimo = (
  historico: readonly EventoDoPedido[],
  tipos: readonly TipoDeEvento[],
): EventoDoPedido | null =>
  [...historico].reverse().find((evento) => tipos.includes(evento.tipo)) ?? null;

const doEvento = (id: string, rotulo: string, evento: EventoDoPedido | null): PassoDoPedido => ({
  id,
  rotulo,
  em: evento?.em ?? null,
  autor: evento?.porNome ?? null,
  detalhe: evento?.detalhe ?? null,
  feito: evento !== null,
});

const ROTULO_DA_DECISAO: Partial<Record<TipoDeEvento, string>> = {
  LIBERADO: 'Aprovado no crédito',
  LIBERADO_EXCECAO: 'Aprovado por exceção',
  REPROVADO: 'Reprovado no crédito',
};

export const linhaDoPedido = ({ pedido, titulos }: DetalheDoPedido): readonly PassoDoPedido[] => {
  const historico = pedido.historico ?? [];
  const decisao = ultimo(historico, ['LIBERADO', 'LIBERADO_EXCECAO', 'REPROVADO']);
  const passos: PassoDoPedido[] = [
    doEvento('lancado', 'Lançado e enviado', ultimo(historico, ['LANCADO'])),
    {
      ...doEvento('credito', ROTULO_DA_DECISAO[decisao?.tipo ?? 'LIBERADO'] ?? 'Crédito', decisao),
      ...(decisao?.tipo === 'REPROVADO' ? { final: 'reprovado' as const } : {}),
    },
  ];
  if (decisao?.tipo === 'REPROVADO') return passos;

  passos.push(doEvento('faturado', 'Faturado', ultimo(historico, ['FATURADO'])));
  passos.push({
    id: 'nota',
    rotulo: 'NF emitida',
    em: pedido.nota?.emitidaEm ?? null,
    autor: null,
    detalhe: pedido.nota ? `NF ${pedido.nota.numero} · série ${pedido.nota.serie}` : null,
    feito: pedido.nota !== null,
  });
  passos.push({
    id: 'titulos',
    rotulo: 'Títulos gerados',
    em: null,
    autor: null,
    detalhe: titulos.length > 0 ? `${titulos.length} título(s)` : null,
    feito: titulos.length > 0,
  });
  passos.push(doEvento('rota', 'Em rota', ultimo(historico, ['EM_ROTA'])));
  passos.push(doEvento('entregue', 'Entregue', ultimo(historico, ['ENTREGUE'])));
  if (pedido.situacao === 'CANCELADO') {
    passos.push({
      id: 'cancelado',
      rotulo: 'Cancelado',
      em: null,
      autor: null,
      detalhe: 'O pedido está cancelado; a data do cancelamento não foi registrada.',
      feito: true,
      final: 'cancelado',
    });
  }
  return passos;
};
