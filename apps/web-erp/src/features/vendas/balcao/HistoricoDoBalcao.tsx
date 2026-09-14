/* eslint-disable max-lines-per-function */
import { Modal } from '@synapse/ui';
import type { PedidoDeVenda } from '@synapse/types';
import { Copy, LoaderCircle, Printer } from 'lucide-react';
import { useEffect, useState } from 'react';
import { BOTAO_PEQUENO, SELO, TOM } from '../../cadastros/comum/estilos';
import { ROTULO_DA_SITUACAO, ROTULO_DO_TIPO } from '../../credit/analise';
import { formatarMoeda } from '../../customers/formato';
import { dataEHora, inicioDoDia } from '../comum/datas';
import { historicoDoBalcao } from '../comum/vendas.api';

/** Ctrl+H Histórico de Vendas do Ponto de Vendas: os pedidos lançados no
 *  balcão, do mais novo para o mais antigo. Imprime de novo ou copia os itens
 *  para uma venda nova. */

const PERIODOS = [
  { dias: 0, rotulo: 'Hoje' },
  { dias: 7, rotulo: 'Últimos 7 dias' },
  { dias: 30, rotulo: 'Últimos 30 dias' },
  { dias: 90, rotulo: 'Últimos 90 dias' },
] as const;

const TOM_DA_SITUACAO: Readonly<Record<PedidoDeVenda['situacao'], keyof typeof TOM>> = {
  AGUARDANDO_ANALISE: 'alerta',
  APROVADO: 'positivo',
  REPROVADO: 'perigo',
  FATURADO: 'positivo',
  CANCELADO: 'neutro',
};

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
        <div className="flex flex-wrap items-center gap-2">
          <div className="bg-surface-soft inline-flex rounded-full p-1">
            {PERIODOS.map((periodo) => (
              <button
                key={periodo.dias}
                type="button"
                aria-pressed={dias === periodo.dias}
                onClick={() => setDias(periodo.dias)}
                className={`text-button-sm h-8 rounded-full px-3 transition ${
                  dias === periodo.dias ? 'text-ink bg-white shadow-sm' : 'text-mute hover:text-ink'
                }`}
              >
                {periodo.rotulo}
              </button>
            ))}
          </div>
          <label className="text-body-sm text-charcoal flex items-center gap-2">
            <input
              type="checkbox"
              checked={soDoVendedor}
              disabled={!vendedorId}
              onChange={(evento) => setSoDoVendedor(evento.target.checked)}
            />
            Só do vendedor da tela
          </label>
          <span className="text-body-sm text-stone ml-auto">
            {pedidos?.length ?? 0} pedidos · {formatarMoeda(total)}
          </span>
        </div>

        {erro ? <p className="text-body-sm text-[#b3242f]">{erro}</p> : null}
        <div className="border-hairline-light overflow-auto rounded-2xl border">
          {pedidos === null ? (
            <p className="text-body-sm text-stone flex items-center gap-2 p-4">
              <LoaderCircle size={15} className="animate-spin" aria-hidden="true" /> Carregando…
            </p>
          ) : null}
          {pedidos?.length === 0 && !erro ? (
            <p className="text-body-sm text-stone p-8 text-center">Nenhum pedido no período.</p>
          ) : null}
          {pedidos?.length ? (
            <table className="w-full min-w-[900px]">
              <thead>
                <tr className="text-caption text-stone border-hairline-light border-b text-left">
                  {['Nº', 'Data', 'Cliente', 'Vendedor', 'Tipo', 'Situação', 'Total', ''].map(
                    (coluna) => (
                      <th key={coluna} className="px-3 py-2 font-medium">
                        {coluna}
                      </th>
                    ),
                  )}
                </tr>
              </thead>
              <tbody>
                {pedidos.map((pedido) => (
                  <tr
                    key={pedido.id}
                    className="border-hairline-light text-body-sm hover:bg-surface-soft border-b last:border-0"
                  >
                    <td className="text-ink px-3 py-2 font-semibold tabular-nums">
                      {pedido.numero}
                    </td>
                    <td className="text-charcoal px-3 py-2 tabular-nums">
                      {dataEHora(pedido.enviadoEm)}
                    </td>
                    <td className="text-ink max-w-[16rem] truncate px-3 py-2">
                      {pedido.clienteNome}
                    </td>
                    <td className="text-charcoal px-3 py-2">
                      {pedido.vendedorCodigo ? `${pedido.vendedorCodigo} - ` : ''}
                      {pedido.vendedorNome}
                    </td>
                    <td className="text-charcoal px-3 py-2">{ROTULO_DO_TIPO[pedido.tipo]}</td>
                    <td className="px-3 py-2">
                      <span className={`${SELO} ${TOM[TOM_DA_SITUACAO[pedido.situacao]]}`}>
                        {ROTULO_DA_SITUACAO[pedido.situacao]}
                      </span>
                    </td>
                    <td className="text-ink px-3 py-2 text-right font-semibold tabular-nums">
                      {formatarMoeda(pedido.totalCentavos)}
                    </td>
                    <td className="px-3 py-2">
                      <div className="flex justify-end gap-1.5">
                        <button
                          type="button"
                          onClick={() => aoImprimir(pedido)}
                          className={BOTAO_PEQUENO}
                        >
                          <Printer size={13} aria-hidden="true" /> Imprimir
                        </button>
                        <button
                          type="button"
                          onClick={() => aoCopiar(pedido)}
                          className={BOTAO_PEQUENO}
                        >
                          <Copy size={13} aria-hidden="true" /> Copiar itens
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : null}
        </div>
      </div>
    </Modal>
  );
}
