import type { EtapaDoPedido, PedidoDeVenda } from '@synapse/types';

/** O feed de observacoes do pedido: as observacoes gravadas e as
 *  justificativas das decisoes do credito, lidas do historico — sem copiar o
 *  texto para outro lugar. */

export interface EntradaDoFeed {
  readonly id: string;
  readonly categoria: 'VENDEDOR' | 'FINANCEIRA' | 'DECISAO' | 'OUTRA';
  readonly etapa: EtapaDoPedido;
  readonly texto: string;
  readonly autor: string;
  readonly em: string;
}

const categoriaDaEtapa = (etapa: EtapaDoPedido): EntradaDoFeed['categoria'] => {
  if (etapa === 'VENDEDOR') return 'VENDEDOR';
  if (etapa === 'CREDITO') return 'FINANCEIRA';
  return 'OUTRA';
};

const DECISOES = new Set(['LIBERADO', 'LIBERADO_EXCECAO', 'REPROVADO']);

export const feedDoPedido = (pedido: PedidoDeVenda): readonly EntradaDoFeed[] => {
  const observacoes: EntradaDoFeed[] = (pedido.observacoes ?? []).map((observacao) => ({
    id: observacao.id,
    categoria: categoriaDaEtapa(observacao.etapa),
    etapa: observacao.etapa,
    texto: observacao.texto,
    autor: observacao.porNome,
    em: observacao.em,
  }));
  const decisoes: EntradaDoFeed[] = (pedido.historico ?? []).flatMap((evento, indice) =>
    DECISOES.has(evento.tipo) && evento.justificativa
      ? [
          {
            id: `decisao-${indice}`,
            categoria: 'DECISAO' as const,
            etapa: evento.etapa,
            texto: evento.justificativa,
            autor: evento.porNome,
            em: evento.em,
          },
        ]
      : [],
  );
  return [...observacoes, ...decisoes].sort((a, b) => b.em.localeCompare(a.em));
};
