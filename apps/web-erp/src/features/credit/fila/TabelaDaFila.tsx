import type { PedidoNaFila, TipoDePedido } from '@synapse/types';
import { ArrowDown, ArrowUp, GripVertical } from 'lucide-react';
import {
  useState,
  type DragEvent as EventoDeArrasto,
  type KeyboardEvent as EventoDeTecla,
} from 'react';
import {
  formatarDataHora,
  formatarDocumento,
  formatarMoeda,
  prazoDoPedido,
  ROTULO_DO_TIPO,
} from '../analise';
import { COLUNAS, type IdDaColuna, type Ordenacao } from './colunas';

const TOM_DO_TIPO: Record<TipoDePedido, string> = {
  VENDA: 'border-hairline-light text-charcoal',
  BONIFICACAO: 'border-accent-warning/40 text-accent-warning',
  TROCA: 'border-accent-link/40 text-accent-link',
  DEVOLUCAO: 'border-accent-danger/40 text-accent-danger',
  CONSIGNACAO: 'border-accent-teal/40 text-accent-teal',
  AMOSTRA: 'border-hairline-light text-mute',
};

function Etiqueta({ tipo }: { readonly tipo: TipoDePedido }) {
  return (
    <span
      className={`text-caption inline-flex rounded-full border px-2.5 py-0.5 ${TOM_DO_TIPO[tipo]}`}
    >
      {ROTULO_DO_TIPO[tipo]}
    </span>
  );
}

function Situacao({ cliente }: { readonly cliente: PedidoNaFila['cliente'] }) {
  if (cliente.titulosVencidos > 0) {
    return (
      <span className="text-accent-danger font-semibold">
        {cliente.diasDeAtrasoMaximo} d · {formatarMoeda(cliente.vencidoCentavos)}
      </span>
    );
  }
  if (cliente.aVencerCentavos > 0) {
    return <span className="text-charcoal">Em dia · {formatarMoeda(cliente.aVencerCentavos)}</span>;
  }
  return <span className="text-stone">Sem dívida</span>;
}

function Celula({ coluna, linha }: { readonly coluna: IdDaColuna; readonly linha: PedidoNaFila }) {
  const { pedido, cliente } = linha;
  if (coluna === 'pedido')
    return <span className="text-ink font-semibold tabular-nums">{pedido.numero}</span>;
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
  if (coluna === 'tipo') return <Etiqueta tipo={pedido.tipo} />;
  if (coluna === 'documento')
    return (
      <span className="text-charcoal tabular-nums">
        {formatarDocumento(pedido.clienteDocumento)}
      </span>
    );
  if (coluna === 'situacao') return <Situacao cliente={cliente} />;
  if (coluna === 'valor')
    return (
      <span className="text-ink font-semibold tabular-nums">
        {formatarMoeda(pedido.totalCentavos)}
      </span>
    );
  if (coluna === 'prazo')
    return <span className="text-charcoal tabular-nums">{prazoDoPedido(pedido)}</span>;
  if (coluna === 'enviadoEm')
    return <span className="text-charcoal tabular-nums">{formatarDataHora(pedido.enviadoEm)}</span>;
  return (
    <span className="text-charcoal block truncate">{String(COLUNAS[coluna].valor(linha))}</span>
  );
}

function Cabecalho({
  ordem,
  ordenacao,
  alvo,
  aoOrdenar,
  aoArrastar,
  aoSoltar,
  aoMirar,
}: {
  readonly ordem: readonly IdDaColuna[];
  readonly ordenacao: Ordenacao;
  readonly alvo: IdDaColuna | null;
  readonly aoOrdenar: (coluna: IdDaColuna) => void;
  readonly aoArrastar: (coluna: IdDaColuna, evento: EventoDeArrasto) => void;
  readonly aoSoltar: (coluna: IdDaColuna, evento: EventoDeArrasto) => void;
  readonly aoMirar: (coluna: IdDaColuna | null) => void;
}) {
  return (
    <thead className="sticky top-0 z-10">
      <tr className="border-hairline-light bg-surface-soft border-b">
        {ordem.map((id) => {
          const coluna = COLUNAS[id];
          const ordenada = ordenacao.coluna === id;
          const Seta = ordenacao.direcao === 'asc' ? ArrowUp : ArrowDown;
          return (
            <th
              key={id}
              scope="col"
              draggable
              onDragStart={(evento) => aoArrastar(id, evento)}
              onDragOver={(evento) => {
                evento.preventDefault();
                aoMirar(id);
              }}
              onDragLeave={() => aoMirar(null)}
              onDrop={(evento) => aoSoltar(id, evento)}
              onDoubleClick={() => aoOrdenar(id)}
              aria-sort={
                ordenada ? (ordenacao.direcao === 'asc' ? 'ascending' : 'descending') : 'none'
              }
              title={`Dois cliques ordenam ${coluna.criterio}. Arraste para mudar a ordem das colunas.`}
              style={{ minWidth: coluna.larguraMinima }}
              className={`text-caption text-stone group cursor-grab select-none whitespace-nowrap px-3 py-2.5 font-medium active:cursor-grabbing ${
                coluna.alinhamento === 'direita' ? 'text-right' : 'text-left'
              } ${alvo === id ? 'bg-surface-soft' : ''}`}
            >
              <span
                className={`inline-flex items-center gap-1.5 ${
                  coluna.alinhamento === 'direita' ? 'flex-row-reverse' : ''
                }`}
              >
                <GripVertical
                  size={12}
                  aria-hidden="true"
                  className="text-faint opacity-0 transition group-hover:opacity-100"
                />
                <span className={ordenada ? 'text-ink font-semibold' : ''}>{coluna.rotulo}</span>
                {ordenada && <Seta size={12} aria-hidden="true" className="text-ink" />}
              </span>
            </th>
          );
        })}
      </tr>
    </thead>
  );
}

function LinhaDaTabela({
  linha,
  ordem,
  selecionada,
  aoEscolher,
  aoTeclar,
}: {
  readonly linha: PedidoNaFila;
  readonly ordem: readonly IdDaColuna[];
  readonly selecionada: boolean;
  readonly aoEscolher: () => void;
  readonly aoTeclar: (evento: EventoDeTecla<HTMLTableRowElement>) => void;
}) {
  return (
    <tr
      tabIndex={0}
      onClick={aoEscolher}
      onKeyDown={aoTeclar}
      aria-current={selecionada}
      className={`border-hairline-light text-body-sm cursor-pointer border-b outline-none transition last:border-b-0 ${
        selecionada ? 'bg-surface-soft' : 'hover:bg-surface-soft focus-visible:bg-surface-soft'
      }`}
    >
      {ordem.map((id) => (
        <td
          key={id}
          className={`max-w-[280px] truncate whitespace-nowrap px-3 py-2.5 ${
            COLUNAS[id].alinhamento === 'direita' ? 'text-right' : 'text-left'
          }`}
        >
          <Celula coluna={id} linha={linha} />
        </td>
      ))}
    </tr>
  );
}

export function TabelaDaFila({
  linhas,
  ordem,
  ordenacao,
  clienteSelecionado,
  aoOrdenar,
  aoMover,
  aoEscolher,
}: {
  readonly linhas: readonly PedidoNaFila[];
  readonly ordem: readonly IdDaColuna[];
  readonly ordenacao: Ordenacao;
  readonly clienteSelecionado: string | null;
  readonly aoOrdenar: (coluna: IdDaColuna) => void;
  readonly aoMover: (arrastada: IdDaColuna, alvo: IdDaColuna) => void;
  readonly aoEscolher: (linha: PedidoNaFila) => void;
}) {
  const [alvo, setAlvo] = useState<IdDaColuna | null>(null);

  const navegar = (evento: EventoDeTecla<HTMLTableRowElement>, linha: PedidoNaFila) => {
    if (evento.key === 'Enter' || evento.key === ' ') {
      evento.preventDefault();
      aoEscolher(linha);
      return;
    }
    if (evento.key !== 'ArrowDown' && evento.key !== 'ArrowUp') return;
    evento.preventDefault();
    const alvoDaTecla =
      evento.key === 'ArrowDown'
        ? evento.currentTarget.nextElementSibling
        : evento.currentTarget.previousElementSibling;
    (alvoDaTecla as HTMLElement | null)?.focus();
  };

  return (
    <table className="w-full border-collapse text-left">
      <Cabecalho
        ordem={ordem}
        ordenacao={ordenacao}
        alvo={alvo}
        aoOrdenar={aoOrdenar}
        aoArrastar={(coluna, evento) => {
          evento.dataTransfer.setData('text/plain', coluna);
          evento.dataTransfer.effectAllowed = 'move';
        }}
        aoSoltar={(coluna, evento) => {
          evento.preventDefault();
          const arrastada = evento.dataTransfer.getData('text/plain') as IdDaColuna;
          if (arrastada) aoMover(arrastada, coluna);
          setAlvo(null);
        }}
        aoMirar={setAlvo}
      />
      <tbody>
        {linhas.map((linha) => (
          <LinhaDaTabela
            key={linha.pedido.id}
            linha={linha}
            ordem={ordem}
            selecionada={linha.pedido.customerId === clienteSelecionado}
            aoEscolher={() => aoEscolher(linha)}
            aoTeclar={(evento) => navegar(evento, linha)}
          />
        ))}
      </tbody>
    </table>
  );
}
