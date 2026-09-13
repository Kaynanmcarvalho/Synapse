import type { PedidoNaFila, TipoDePedido } from '@synapse/types';
import type { ReactNode } from 'react';
import { formatarDocumento, formatarMoeda, ROTULO_DO_TIPO } from '../analise';
import { Motivos } from '../ui/Etiquetas';
import { textoDaCelula, type IdDaColuna } from './colunas';

/** Como cada coluna desenha o seu dado: etiqueta no tipo e no motivo, mascara
 *  no CNPJ, numero tabular no dinheiro. O resto e texto corrido, cortado com
 *  reticencias. */
const TOM_DO_TIPO: Record<TipoDePedido, string> = {
  VENDA: 'border-hairline-light text-charcoal',
  BONIFICACAO: 'border-accent-warning/40 text-[#8a4b00]',
  TROCA: 'border-accent-link/40 text-accent-link',
  DEVOLUCAO: 'border-accent-danger/40 text-[#b3242f]',
  CONSIGNACAO: 'border-accent-teal/40 text-accent-green-text',
  AMOSTRA: 'border-hairline-light text-mute',
};

function Impressao({
  impresso,
  aoAlternar,
}: {
  readonly impresso: boolean;
  readonly aoAlternar: () => void;
}) {
  return (
    <button
      type="button"
      aria-pressed={impresso}
      title={impresso ? 'Impresso por você — clique para desmarcar' : 'Marcar como impresso'}
      onClick={(evento) => {
        evento.stopPropagation();
        aoAlternar();
      }}
      onDoubleClick={(evento) => evento.stopPropagation()}
      className={`text-caption inline-flex h-6 min-w-[52px] items-center justify-center rounded-full border font-semibold uppercase tracking-[0.04em] transition ${
        impresso
          ? 'border-accent-teal/40 text-accent-green-text hover:bg-accent-teal/5'
          : 'border-hairline-light text-stone hover:bg-surface-soft'
      }`}
    >
      {impresso ? 'Sim' : 'Não'}
    </button>
  );
}

const dinheiro = (centavos: number, forte = true) => (
  <span className={`tabular-nums ${forte ? 'text-ink font-semibold' : 'text-stone'}`}>
    {formatarMoeda(centavos)}
  </span>
);

type Desenho = (linha: PedidoNaFila, aoAlternarImpressao: () => void) => ReactNode;

const DESENHOS: Partial<Record<IdDaColuna, Desenho>> = {
  pedido: ({ pedido }) => (
    <span className="text-ink font-semibold tabular-nums">{pedido.numero}</span>
  ),
  impressao: (linha, aoAlternar) => <Impressao impresso={linha.impresso} aoAlternar={aoAlternar} />,
  cliente: ({ pedido, cliente }) => (
    <span className="flex min-w-0 items-center gap-2">
      {cliente.titulosVencidos > 0 && (
        <span
          role="img"
          aria-label="Cliente com título vencido"
          title="Cliente com título vencido"
          className="bg-accent-danger h-1.5 w-1.5 shrink-0 rounded-full"
        />
      )}
      <span className="text-ink truncate font-semibold">{pedido.clienteNome}</span>
    </span>
  ),
  tipo: ({ pedido }) => (
    <span
      className={`text-caption inline-flex rounded-full border px-2.5 py-0.5 ${TOM_DO_TIPO[pedido.tipo]}`}
    >
      {ROTULO_DO_TIPO[pedido.tipo]}
    </span>
  ),
  motivo: ({ avaliacao }) => <Motivos motivos={avaliacao.motivos} maximo={1} />,
  documento: ({ pedido }) => (
    <span className="text-charcoal tabular-nums">{formatarDocumento(pedido.clienteDocumento)}</span>
  ),
  valor: ({ pedido }) => dinheiro(pedido.totalCentavos),
  exposicao: ({ avaliacao }) => (
    <span title={avaliacao.exposicao.explicacao}>
      {dinheiro(avaliacao.exposicao.exposicaoCentavos, avaliacao.exposicao.exposicaoCentavos > 0)}
    </span>
  ),
};

const NUMERICAS = new Set<IdDaColuna>(['enviadoEm', 'prazo', 'itens', 'aguardando']);

export function Celula({
  coluna,
  linha,
  aoAlternarImpressao,
}: {
  readonly coluna: IdDaColuna;
  readonly linha: PedidoNaFila;
  readonly aoAlternarImpressao: () => void;
}) {
  const desenho = DESENHOS[coluna];
  if (desenho) return <>{desenho(linha, aoAlternarImpressao)}</>;
  return (
    <span className={`text-charcoal block truncate ${NUMERICAS.has(coluna) ? 'tabular-nums' : ''}`}>
      {textoDaCelula(coluna, linha)}
    </span>
  );
}
