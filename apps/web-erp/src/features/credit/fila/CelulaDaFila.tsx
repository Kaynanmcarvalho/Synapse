import { Status, type TomDeStatus } from '@synapse/sdl';
import type { PedidoNaFila, TipoDePedido } from '@synapse/types';
import type { ReactNode } from 'react';
import { formatarDocumento, formatarMoeda, ROTULO_DO_TIPO } from '../analise';
import { Motivos } from '../ui/Etiquetas';
import { textoDaCelula, type IdDaColuna } from './colunas';

/** Como cada coluna desenha o seu dado: `Status` no tipo, mascara no CNPJ,
 *  `font-data` no dinheiro e nos números. O resto é texto corrido, cortado
 *  com reticências.
 *
 *  Tipo de pedido não é "bom/ruim" como os outros tons do Status — são seis
 *  categorias que precisam ficar distintas entre si. Os oito tons do SDL dão
 *  conta disso sem inventar cor solta (`#8a4b00`/`#b3242f`) fora do tema. */
const TOM_DO_TIPO: Record<TipoDePedido, TomDeStatus> = {
  VENDA: 'neutro',
  BONIFICACAO: 'atencao',
  TROCA: 'info',
  DEVOLUCAO: 'perigo',
  CONSIGNACAO: 'ok',
  AMOSTRA: 'pendente',
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
      className={`text-caption rounded-pequeno inline-flex h-6 min-w-[48px] items-center justify-center font-medium transition ${
        impresso
          ? 'text-status-ok hover:bg-status-ok-fundo'
          : 'text-ink-sutil hover:bg-surface-hover'
      }`}
    >
      {impresso ? 'Sim' : 'Não'}
    </button>
  );
}

const dinheiro = (centavos: number, forte = true) => (
  <span className={`font-data ${forte ? 'text-ink font-semibold' : 'text-stone'}`}>
    {formatarMoeda(centavos)}
  </span>
);

type Desenho = (linha: PedidoNaFila, aoAlternarImpressao: () => void) => ReactNode;

const DESENHOS: Partial<Record<IdDaColuna, Desenho>> = {
  pedido: ({ pedido }) => <span className="text-ink font-data font-semibold">{pedido.numero}</span>,
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
    <Status tone={TOM_DO_TIPO[pedido.tipo]} className="text-caption">
      {ROTULO_DO_TIPO[pedido.tipo]}
    </Status>
  ),
  motivo: ({ avaliacao }) => <Motivos motivos={avaliacao.motivos} maximo={1} />,
  documento: ({ pedido }) => (
    <span className="text-charcoal font-data">{formatarDocumento(pedido.clienteDocumento)}</span>
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
    <span className={`text-charcoal block truncate ${NUMERICAS.has(coluna) ? 'font-data' : ''}`}>
      {textoDaCelula(coluna, linha)}
    </span>
  );
}
