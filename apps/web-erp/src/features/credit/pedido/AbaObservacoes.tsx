import type { EtapaDoPedido, PedidoDeVenda } from '@synapse/types';
import { MessageSquarePlus } from 'lucide-react';
import { useState } from 'react';
import { formatarDataHora } from '../analise';
import { ROTULO_DA_ETAPA } from './rotulos';

const TOM_DA_ETAPA: Record<EtapaDoPedido, string> = {
  VENDEDOR: 'border-accent-link/40 text-accent-link',
  GERENCIA_COMERCIAL: 'border-accent-warning/40 text-accent-warning',
  CREDITO: 'border-canvas-dark/30 text-ink',
  FATURAMENTO: 'border-accent-teal/40 text-accent-teal',
  EXPEDICAO: 'border-hairline-strong/30 text-charcoal',
};

export function EtiquetaDaEtapa({ etapa }: { readonly etapa: EtapaDoPedido }) {
  return (
    <span
      className={`text-caption inline-flex rounded-full border px-2.5 py-0.5 font-semibold ${TOM_DA_ETAPA[etapa]}`}
    >
      {ROTULO_DA_ETAPA[etapa]}
    </span>
  );
}

/** Tudo que foi escrito sobre o pedido, e em que etapa: e o que diz se o recado
 *  veio do vendedor, da gerencia, do credito, do faturamento ou da expedicao. */
export function AbaObservacoes({
  pedido,
  aoObservar,
}: {
  readonly pedido: PedidoDeVenda;
  readonly aoObservar: (texto: string) => Promise<void>;
}) {
  const [texto, setTexto] = useState('');
  const [enviando, setEnviando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const observacoes = [...(pedido.observacoes ?? [])].sort((a, b) => b.em.localeCompare(a.em));

  const enviar = async () => {
    if (!texto.trim()) return;
    setEnviando(true);
    setErro(null);
    try {
      await aoObservar(texto.trim());
      setTexto('');
    } catch (causa) {
      setErro(causa instanceof Error ? causa.message : 'Não foi possível salvar a observação.');
    } finally {
      setEnviando(false);
    }
  };

  return (
    <div className="grid gap-4">
      <div className="border-hairline-light bg-canvas-light shadow-cartao rounded-2xl border p-4">
        <label className="text-caption text-stone font-semibold uppercase tracking-[0.08em]">
          Nova observação do crédito
          <textarea
            value={texto}
            onChange={(evento) => setTexto(evento.target.value)}
            rows={3}
            maxLength={1000}
            placeholder="Ex.: liberado com a condição de faturar só depois do dia 20."
            className="border-hairline-light text-body-sm text-ink placeholder:text-stone focus:border-hairline-strong mt-2 w-full resize-y rounded-xl border px-3 py-2 font-normal normal-case tracking-normal outline-none transition"
          />
        </label>
        <div className="mt-2 flex items-center justify-between gap-3">
          <span className="text-caption text-accent-danger">{erro}</span>
          <button
            type="button"
            onClick={() => void enviar()}
            disabled={!texto.trim() || enviando}
            className="bg-canvas-dark text-button-sm hover:bg-charcoal inline-flex h-9 items-center gap-2 rounded-full px-4 text-white transition disabled:opacity-40"
          >
            <MessageSquarePlus size={15} aria-hidden="true" />
            {enviando ? 'Salvando…' : 'Adicionar'}
          </button>
        </div>
      </div>

      {observacoes.length === 0 ? (
        <p className="text-body-sm text-stone py-6 text-center">Nenhuma observação neste pedido.</p>
      ) : (
        <ol className="grid gap-3">
          {observacoes.map((observacao) => (
            <li
              key={observacao.id}
              className="border-hairline-light bg-canvas-light animate-subir rounded-2xl border p-4 motion-reduce:animate-none"
            >
              <div className="flex flex-wrap items-center gap-2">
                <EtiquetaDaEtapa etapa={observacao.etapa} />
                <span className="text-body-sm text-ink font-semibold">{observacao.porNome}</span>
                <span className="text-caption text-stone ml-auto tabular-nums">
                  {formatarDataHora(observacao.em)}
                </span>
              </div>
              <p className="text-body-md text-charcoal mt-2 whitespace-pre-line">
                {observacao.texto}
              </p>
            </li>
          ))}
        </ol>
      )}
    </div>
  );
}
