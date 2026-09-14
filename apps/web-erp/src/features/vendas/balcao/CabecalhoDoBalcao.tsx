/* eslint-disable max-lines-per-function */
import type { ClienteNaLista, PedidoDeVenda } from '@synapse/types';
import { CheckCircle2, Printer, Search, UserRound, X } from 'lucide-react';
import { BOTAO_ICONE, BOTAO_PEQUENO } from '../../cadastros/comum/estilos';
import { formatarDocumento } from '../../customers/formato';
import type { VendedorNaLista } from '../../funcionarios/funcionarios.api';
import { SeletorDeVendedor } from '../comum/SeletorDeVendedor';

/** Pedido (com a lupa do histórico), Cliente (F11) e Vendedor, e o aviso do
 *  último pedido registrado com o botão de imprimir de novo. */
export function CabecalhoDoBalcao({
  ultimo,
  cliente,
  vendedor,
  aoMudarVendedor,
  aoAbrirHistorico,
  aoAbrirCliente,
  aoImprimirUltimo,
  aoDispensarUltimo,
}: {
  readonly ultimo: PedidoDeVenda | null;
  readonly cliente: ClienteNaLista | null;
  readonly vendedor: VendedorNaLista | null;
  readonly aoMudarVendedor: (vendedor: VendedorNaLista | null) => void;
  readonly aoAbrirHistorico: () => void;
  readonly aoAbrirCliente: () => void;
  readonly aoImprimirUltimo: () => void;
  readonly aoDispensarUltimo: () => void;
}) {
  return (
    <>
      {ultimo ? (
        <div className="flex flex-wrap items-center gap-3 rounded-2xl bg-[#e6f6f1] px-4 py-2.5 text-[#00664d]">
          <CheckCircle2 size={17} aria-hidden="true" />
          <span className="text-body-sm flex-1">
            Pedido nº <strong>{ultimo.numero}</strong> registrado para {ultimo.clienteNome} — na
            Análise de Crédito.
          </span>
          <button type="button" onClick={aoImprimirUltimo} className={BOTAO_PEQUENO}>
            <Printer size={13} aria-hidden="true" /> Imprimir
          </button>
          <button
            type="button"
            onClick={aoDispensarUltimo}
            aria-label="Fechar aviso"
            className="rounded-full p-1 hover:bg-white/60"
          >
            <X size={15} aria-hidden="true" />
          </button>
        </div>
      ) : null}

      <section className="border-hairline-light grid gap-3 rounded-2xl border bg-white p-3 md:grid-cols-[10rem_minmax(0,1fr)_minmax(0,18rem)]">
        <div>
          <p className="text-caption text-charcoal mb-1 font-medium">Pedido</p>
          <div className="flex gap-2">
            <p className="border-hairline-light bg-surface-soft text-body-md text-ink flex h-11 flex-1 items-center rounded-xl border px-3 tabular-nums">
              {ultimo ? ultimo.numero : 'Novo'}
            </p>
            <button
              type="button"
              onClick={aoAbrirHistorico}
              aria-label="Histórico de vendas"
              className={BOTAO_ICONE}
            >
              <Search size={16} aria-hidden="true" />
            </button>
          </div>
        </div>
        <div className="min-w-0">
          <p className="text-caption text-charcoal mb-1 font-medium">Cliente</p>
          <button
            type="button"
            onClick={aoAbrirCliente}
            className="border-hairline-light hover:border-faint flex h-11 w-full min-w-0 items-center gap-2 rounded-xl border bg-white px-3 text-left"
          >
            <UserRound size={16} aria-hidden="true" className="text-stone shrink-0" />
            {cliente ? (
              <span className="text-body-sm text-ink min-w-0 truncate">
                <strong>
                  {cliente.codigo ? `${cliente.codigo} - ` : ''}
                  {cliente.nome}
                </strong>
                <span className="text-stone"> · {formatarDocumento(cliente.documento)}</span>
              </span>
            ) : (
              <span className="text-body-sm text-stone">(F11) Informar cliente</span>
            )}
          </button>
        </div>
        <SeletorDeVendedor
          chave="synapse:balcao:vendedor"
          valor={vendedor}
          aoMudar={aoMudarVendedor}
        />
      </section>
    </>
  );
}
