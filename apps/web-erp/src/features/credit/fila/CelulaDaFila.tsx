import type { PedidoNaFila, TipoDePedido } from '@synapse/types';
import { formatarDocumento, formatarMoeda, ROTULO_DO_TIPO } from '../analise';
import { textoDaCelula, type IdDaColuna } from './colunas';

/** Como cada coluna desenha o seu dado: etiqueta no tipo, mascara no CNPJ,
 *  numero tabular no valor. O resto e texto corrido, cortado com reticencias. */
const TOM_DO_TIPO: Record<TipoDePedido, string> = {
  VENDA: 'border-hairline-light text-charcoal',
  BONIFICACAO: 'border-accent-warning/40 text-accent-warning',
  TROCA: 'border-accent-link/40 text-accent-link',
  DEVOLUCAO: 'border-accent-danger/40 text-accent-danger',
  CONSIGNACAO: 'border-accent-teal/40 text-accent-teal',
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
          ? 'border-accent-teal/40 text-accent-teal hover:bg-accent-teal/5'
          : 'border-hairline-light text-stone hover:bg-surface-soft'
      }`}
    >
      {impresso ? 'Sim' : 'Não'}
    </button>
  );
}

export function Celula({
  coluna,
  linha,
  aoAlternarImpressao,
}: {
  readonly coluna: IdDaColuna;
  readonly linha: PedidoNaFila;
  readonly aoAlternarImpressao: () => void;
}) {
  const { pedido, cliente } = linha;
  if (coluna === 'pedido')
    return <span className="text-ink font-semibold tabular-nums">{pedido.numero}</span>;
  if (coluna === 'impressao')
    return <Impressao impresso={linha.impresso} aoAlternar={aoAlternarImpressao} />;
  if (coluna === 'cliente') {
    return (
      <span className="flex min-w-0 items-center gap-2">
        {cliente.titulosVencidos > 0 && (
          <span
            aria-hidden="true"
            title="Cliente com título vencido"
            className="bg-accent-danger h-1.5 w-1.5 shrink-0 rounded-full"
          />
        )}
        <span className="text-ink truncate font-semibold">{pedido.clienteNome}</span>
      </span>
    );
  }
  if (coluna === 'tipo')
    return (
      <span
        className={`text-caption inline-flex rounded-full border px-2.5 py-0.5 ${TOM_DO_TIPO[pedido.tipo]}`}
      >
        {ROTULO_DO_TIPO[pedido.tipo]}
      </span>
    );
  if (coluna === 'documento')
    return (
      <span className="text-charcoal tabular-nums">
        {formatarDocumento(pedido.clienteDocumento)}
      </span>
    );
  if (coluna === 'valor')
    return (
      <span className="text-ink font-semibold tabular-nums">
        {formatarMoeda(pedido.totalCentavos)}
      </span>
    );
  const conteudo = textoDaCelula(coluna, linha);
  const numerico = coluna === 'enviadoEm' || coluna === 'prazo' || coluna === 'itens';
  return (
    <span className={`text-charcoal block truncate ${numerico ? 'tabular-nums' : ''}`}>
      {conteudo}
    </span>
  );
}
