/* eslint-disable max-lines-per-function */
import { Modal } from '@synapse/ui';
import type { PosSale } from '@synapse/types';
import { Ban, Copy, FileText, LoaderCircle, Printer } from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';
import { BOTAO_PEQUENO, SELO, TOM } from '../../cadastros/comum/estilos';
import { formatarMoeda } from '../../customers/formato';
import { dataEHora } from '../comum/datas';
import { JanelaDeTexto } from '../comum/JanelaDeTexto';
import { abrirDanfe, cancelarVenda, vendasDoCaixa } from '../comum/vendas.api';

/** As vendas deste caixa, da mais nova para a mais antiga. A mesma lista serve
 *  o Histórico de Vendas (imprimir, copiar), o Ctrl+D Cancelar Venda e o F8
 *  Consultar NF (só as que têm NFC-e). */

export type UsoDaLista = 'historico' | 'cancelar' | 'nf';

const TITULO: Readonly<Record<UsoDaLista, { titulo: string; descricao: string }>> = {
  historico: { titulo: 'Histórico de Vendas', descricao: 'Vendas deste caixa' },
  cancelar: {
    titulo: 'Cancelar Venda',
    descricao: 'O cancelamento devolve o estoque, tira o dinheiro da gaveta e cancela a NFC-e',
  },
  nf: { titulo: 'Consultar NF', descricao: 'NFC-e emitidas neste caixa' },
};

export function VendasDoCaixa({
  uso,
  caixaId,
  aoImprimir,
  aoCopiar,
  aoCancelada,
  aoFechar,
}: {
  readonly uso: UsoDaLista;
  readonly caixaId: string;
  readonly aoImprimir: (venda: PosSale) => void;
  readonly aoCopiar: (venda: PosSale) => void;
  readonly aoCancelada: (venda: PosSale) => void;
  readonly aoFechar: () => void;
}) {
  const [vendas, setVendas] = useState<readonly PosSale[] | null>(null);
  const [erro, setErro] = useState<string | null>(null);
  const [cancelando, setCancelando] = useState<PosSale | null>(null);
  const [ocupada, setOcupada] = useState<string | null>(null);

  const carregar = useCallback(async () => {
    try {
      const lista = await vendasDoCaixa(caixaId);
      setVendas(uso === 'nf' ? lista.filter((venda) => venda.nfceDocumentId) : lista);
    } catch (falha: unknown) {
      setErro(falha instanceof Error ? falha.message : 'Não foi possível carregar as vendas');
      setVendas([]);
    }
  }, [caixaId, uso]);

  useEffect(() => {
    void carregar();
  }, [carregar]);

  const verNota = async (venda: PosSale) => {
    if (!venda.nfceDocumentId) return;
    setOcupada(venda.id);
    try {
      await abrirDanfe(venda.nfceDocumentId);
    } catch (falha: unknown) {
      setErro(falha instanceof Error ? falha.message : 'Não foi possível abrir a NFC-e');
    } finally {
      setOcupada(null);
    }
  };

  const cancelar = async (venda: PosSale, motivo: string) => {
    setCancelando(null);
    setOcupada(venda.id);
    setErro(null);
    try {
      aoCancelada(await cancelarVenda(venda.id, motivo));
      await carregar();
    } catch (falha: unknown) {
      setErro(falha instanceof Error ? falha.message : 'Não foi possível cancelar a venda');
    } finally {
      setOcupada(null);
    }
  };

  const concluidas = (vendas ?? []).filter((venda) => venda.situacao !== 'CANCELADA');
  const total = concluidas.reduce((soma, venda) => soma + venda.total, 0);

  return (
    <>
      <Modal
        onClose={aoFechar}
        title={TITULO[uso].titulo}
        description={TITULO[uso].descricao}
        size="full"
      >
        <div className="flex flex-col gap-3">
          <p className="text-body-sm text-stone">
            {concluidas.length} vendas concluídas · {formatarMoeda(total)}
          </p>
          {erro ? <p className="text-body-sm text-[#b3242f]">{erro}</p> : null}
          <div className="border-hairline-light overflow-auto rounded-2xl border">
            {vendas === null ? (
              <p className="text-body-sm text-stone flex items-center gap-2 p-4">
                <LoaderCircle size={15} className="animate-spin" aria-hidden="true" /> Carregando…
              </p>
            ) : null}
            {vendas?.length === 0 && !erro ? (
              <p className="text-body-sm text-stone p-8 text-center">Nenhuma venda para mostrar.</p>
            ) : null}
            {vendas?.length ? (
              <table className="w-full min-w-[860px]">
                <thead>
                  <tr className="text-caption text-stone border-hairline-light border-b text-left">
                    {['Nº', 'Data', 'Cliente', 'Vendedor', 'Itens', 'Total', 'Situação', ''].map(
                      (coluna) => (
                        <th key={coluna} className="px-3 py-2 font-medium">
                          {coluna}
                        </th>
                      ),
                    )}
                  </tr>
                </thead>
                <tbody>
                  {vendas.map((venda) => {
                    const cancelada = venda.situacao === 'CANCELADA';
                    return (
                      <tr
                        key={venda.id}
                        className="border-hairline-light text-body-sm hover:bg-surface-soft border-b last:border-0"
                      >
                        <td className="text-ink px-3 py-2 font-semibold tabular-nums">
                          {venda.numero}
                        </td>
                        <td className="text-charcoal px-3 py-2 tabular-nums">
                          {dataEHora(venda.completedAt)}
                        </td>
                        <td className="text-ink max-w-[14rem] truncate px-3 py-2">
                          {venda.clienteNome ?? 'CONSUMIDOR FINAL'}
                        </td>
                        <td className="text-charcoal px-3 py-2">
                          {venda.vendedorCodigo ? `${venda.vendedorCodigo} - ` : ''}
                          {venda.vendedorNome ?? '—'}
                        </td>
                        <td className="text-charcoal px-3 py-2 tabular-nums">
                          {venda.items.length}
                        </td>
                        <td className="text-ink px-3 py-2 text-right font-semibold tabular-nums">
                          {formatarMoeda(venda.total)}
                        </td>
                        <td className="px-3 py-2">
                          <span className={`${SELO} ${cancelada ? TOM.perigo : TOM.positivo}`}>
                            {cancelada ? 'Cancelada' : venda.nfceDocumentId ? 'NFC-e' : 'Concluída'}
                          </span>
                        </td>
                        <td className="px-3 py-2">
                          <div className="flex justify-end gap-1.5">
                            {ocupada === venda.id ? (
                              <LoaderCircle
                                size={15}
                                className="text-stone animate-spin"
                                aria-hidden="true"
                              />
                            ) : null}
                            {venda.nfceDocumentId ? (
                              <button
                                type="button"
                                onClick={() => void verNota(venda)}
                                className={BOTAO_PEQUENO}
                              >
                                <FileText size={13} aria-hidden="true" /> NFC-e
                              </button>
                            ) : null}
                            {uso === 'historico' ? (
                              <>
                                <button
                                  type="button"
                                  onClick={() => aoImprimir(venda)}
                                  className={BOTAO_PEQUENO}
                                >
                                  <Printer size={13} aria-hidden="true" /> Pedido
                                </button>
                                <button
                                  type="button"
                                  onClick={() => aoCopiar(venda)}
                                  className={BOTAO_PEQUENO}
                                >
                                  <Copy size={13} aria-hidden="true" /> Copiar itens
                                </button>
                              </>
                            ) : null}
                            {uso === 'cancelar' && !cancelada ? (
                              <button
                                type="button"
                                onClick={() => setCancelando(venda)}
                                className={`${BOTAO_PEQUENO} text-[#b3242f]`}
                              >
                                <Ban size={13} aria-hidden="true" /> Cancelar
                              </button>
                            ) : null}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            ) : null}
          </div>
        </div>
      </Modal>
      {cancelando ? (
        <JanelaDeTexto
          titulo={`Cancelar a venda nº ${cancelando.numero}`}
          rotulo="Motivo do cancelamento"
          descricao={`${formatarMoeda(cancelando.total)} · ${cancelando.clienteNome ?? 'CONSUMIDOR FINAL'}`}
          minimo={15}
          maximo={255}
          permiteVazio={false}
          aoConfirmar={(motivo) => void cancelar(cancelando, motivo)}
          aoFechar={() => setCancelando(null)}
        />
      ) : null}
    </>
  );
}
