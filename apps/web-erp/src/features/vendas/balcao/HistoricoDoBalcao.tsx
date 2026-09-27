/* eslint-disable max-lines-per-function */
import {
  classesDaLinha,
  DataGridCabecalho,
  DataGridCelula,
  Status,
  Text,
  type TomDeStatus,
} from '@synapse/sdl';
import { Modal } from '@synapse/ui';
import type { PedidoDeVenda } from '@synapse/types';
import { Copy, LoaderCircle, Printer } from 'lucide-react';
import { useEffect, useState } from 'react';
import { CelulaDeDinheiro } from '../../../components/datagrid/CelulaDeDinheiro';
import { ROTULO_DA_SITUACAO, ROTULO_DO_TIPO } from '../../credit/analise';
import { formatarMoeda } from '../../customers/formato';
import { dataEHora, inicioDoDia } from '../comum/datas';
import { historicoDoBalcao } from '../comum/vendas.api';

/** Ctrl+H Histórico de Vendas do Ponto de Vendas: os pedidos lançados no
 *  balcão, do mais novo para o mais antigo. Imprime de novo ou copia os itens
 *  para uma venda nova.
 *
 *  Piloto 4 da fundação de DataGrid (Fase 5.1): traz a Data Row v1 para
 *  dentro de um `Modal` (chrome do `@synapse/ui`, não tocado) — e para uma
 *  tabela sem nenhum tipo de ordenação, só filtro 100% server-side (período +
 *  vendedor). Duas ações por linha (Imprimir/Copiar), não uma. */

const PERIODOS = [
  { dias: 0, rotulo: 'Hoje' },
  { dias: 7, rotulo: 'Últimos 7 dias' },
  { dias: 30, rotulo: 'Últimos 30 dias' },
  { dias: 90, rotulo: 'Últimos 90 dias' },
] as const;

const TOM_DA_SITUACAO: Readonly<Record<PedidoDeVenda['situacao'], TomDeStatus>> = {
  AGUARDANDO_ANALISE: 'atencao',
  APROVADO: 'ok',
  REPROVADO: 'perigo',
  FATURADO: 'ok',
  CANCELADO: 'neutro',
};

function BotaoDeAcao({
  icone: Icone,
  rotulo,
  onClick,
}: {
  readonly icone: typeof Printer;
  readonly rotulo: string;
  readonly onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="text-caption text-ink-medio hover:bg-surface-hover rounded-controle inline-flex h-7 items-center gap-1.5 px-2.5 font-medium transition-colors"
    >
      <Icone size={13} aria-hidden="true" /> {rotulo}
    </button>
  );
}

function Linha({
  pedido,
  aoImprimir,
  aoCopiar,
}: {
  readonly pedido: PedidoDeVenda;
  readonly aoImprimir: (pedido: PedidoDeVenda) => void;
  readonly aoCopiar: (pedido: PedidoDeVenda) => void;
}) {
  return (
    <tr className={classesDaLinha({ clicavel: false, focoComAnel: false, hairlineNaLinha: true })}>
      <DataGridCelula papel="data" truncar={false}>
        <Text variant="dado" className="font-semibold">
          {pedido.numero}
        </Text>
      </DataGridCelula>
      <DataGridCelula papel="data" truncar={false}>
        <Text variant="dado">{dataEHora(pedido.enviadoEm)}</Text>
      </DataGridCelula>
      <DataGridCelula papel="primary">
        <Text variant="corpo" className="max-w-[16rem] truncate">
          {pedido.clienteNome}
        </Text>
      </DataGridCelula>
      <DataGridCelula papel="secondary" truncar={false}>
        <Text variant="corpoSecundario">
          {pedido.vendedorCodigo ? `${pedido.vendedorCodigo} - ` : ''}
          {pedido.vendedorNome}
        </Text>
      </DataGridCelula>
      <DataGridCelula papel="secondary" truncar={false}>
        <Text variant="corpoSecundario">{ROTULO_DO_TIPO[pedido.tipo]}</Text>
      </DataGridCelula>
      <DataGridCelula papel="status" truncar={false}>
        <Status tone={TOM_DA_SITUACAO[pedido.situacao]} variant="chip">
          {ROTULO_DA_SITUACAO[pedido.situacao]}
        </Status>
      </DataGridCelula>
      <CelulaDeDinheiro valorFormatado={formatarMoeda(pedido.totalCentavos)} peso="forte" />
      <DataGridCelula papel="action" truncar={false}>
        <div className="flex justify-end gap-1">
          <BotaoDeAcao icone={Printer} rotulo="Imprimir" onClick={() => aoImprimir(pedido)} />
          <BotaoDeAcao icone={Copy} rotulo="Copiar itens" onClick={() => aoCopiar(pedido)} />
        </div>
      </DataGridCelula>
    </tr>
  );
}

export function HistoricoDoBalcao({
  vendedorId,
  aoImprimir,
  aoCopiar,
  aoFechar,
}: {
  readonly vendedorId: string | null;
  readonly aoImprimir: (pedido: PedidoDeVenda) => void;
  readonly aoCopiar: (pedido: PedidoDeVenda) => void;
  readonly aoFechar: () => void;
}) {
  const [dias, setDias] = useState<number>(0);
  const [soDoVendedor, setSoDoVendedor] = useState(false);
  const [pedidos, setPedidos] = useState<readonly PedidoDeVenda[] | null>(null);
  const [erro, setErro] = useState<string | null>(null);

  useEffect(() => {
    let vivo = true;
    setPedidos(null);
    historicoDoBalcao({
      desde: inicioDoDia(dias),
      funcionarioId: soDoVendedor ? vendedorId : null,
    })
      .then((lista) => {
        if (vivo) setPedidos(lista);
      })
      .catch((falha: unknown) => {
        if (!vivo) return;
        setErro(falha instanceof Error ? falha.message : 'Não foi possível carregar o histórico');
        setPedidos([]);
      });
    return () => {
      vivo = false;
    };
  }, [dias, soDoVendedor, vendedorId]);

  const total = (pedidos ?? [])
    .filter((pedido) => pedido.situacao !== 'CANCELADO')
    .reduce((soma, pedido) => soma + pedido.totalCentavos, 0);

  return (
    <Modal
      onClose={aoFechar}
      title="Histórico de Vendas"
      description="Pedidos do balcão"
      size="full"
    >
      <div className="flex flex-col gap-3">
        <div className="flex flex-wrap items-center gap-1.5">
          {PERIODOS.map((periodo) => (
            <button
              key={periodo.dias}
              type="button"
              aria-pressed={dias === periodo.dias}
              onClick={() => setDias(periodo.dias)}
              className={`text-caption rounded-controle duration-rapido inline-flex items-center gap-1.5 border px-3 py-1 transition-colors ${
                dias === periodo.dias
                  ? 'border-primary bg-primary text-primary-on'
                  : 'border-hairline-light text-charcoal hover:bg-surface-hover'
              }`}
            >
              {periodo.rotulo}
            </button>
          ))}
          <label className="text-body-sm text-charcoal flex items-center gap-2">
            <input
              type="checkbox"
              checked={soDoVendedor}
              disabled={!vendedorId}
              onChange={(evento) => setSoDoVendedor(evento.target.checked)}
            />
            Só do vendedor da tela
          </label>
          <Text variant="corpoSecundario" className="ml-auto">
            {pedidos?.length ?? 0} pedidos · {formatarMoeda(total)}
          </Text>
        </div>

        {erro ? (
          <Text variant="corpoSecundario" tone="perigo">
            {erro}
          </Text>
        ) : null}

        <div className="border-hairline-light overflow-auto rounded-2xl border">
          {pedidos === null ? (
            <Text variant="corpoSecundario" className="flex items-center gap-2 p-4">
              <LoaderCircle size={15} className="animate-spin" aria-hidden="true" /> Carregando…
            </Text>
          ) : null}
          {pedidos?.length === 0 && !erro ? (
            <Text variant="corpoSecundario" className="block p-8 text-center">
              Nenhum pedido no período.
            </Text>
          ) : null}
          {pedidos?.length ? (
            <table className="w-full min-w-[900px] border-collapse text-left">
              <thead>
                <tr className="border-hairline-light bg-surface-soft border-b">
                  {[
                    { id: 'numero', rotulo: 'Nº', alinhamento: 'esquerda' as const },
                    { id: 'data', rotulo: 'Data', alinhamento: 'esquerda' as const },
                    { id: 'cliente', rotulo: 'Cliente', alinhamento: 'esquerda' as const },
                    { id: 'vendedor', rotulo: 'Vendedor', alinhamento: 'esquerda' as const },
                    { id: 'tipo', rotulo: 'Tipo', alinhamento: 'esquerda' as const },
                    { id: 'situacao', rotulo: 'Situação', alinhamento: 'esquerda' as const },
                    { id: 'total', rotulo: 'Total', alinhamento: 'direita' as const },
                    { id: 'acoes', rotulo: '', alinhamento: 'esquerda' as const },
                  ].map((coluna) => (
                    <DataGridCabecalho
                      key={coluna.id}
                      id={coluna.id}
                      rotulo={coluna.rotulo}
                      alinhamento={coluna.alinhamento}
                    />
                  ))}
                </tr>
              </thead>
              <tbody>
                {pedidos.map((pedido) => (
                  <Linha
                    key={pedido.id}
                    pedido={pedido}
                    aoImprimir={aoImprimir}
                    aoCopiar={aoCopiar}
                  />
                ))}
              </tbody>
            </table>
          ) : null}
        </div>
      </div>
    </Modal>
  );
}
