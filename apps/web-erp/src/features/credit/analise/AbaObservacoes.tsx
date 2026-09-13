import type { EtapaDoPedido, PedidoDeVenda } from '@synapse/types';
import { MessageSquarePlus } from 'lucide-react';
import { useState } from 'react';
import { formatarDataHora } from '../analise';
import { BOTAO_ESCURO } from '../ui/Superficies';
import { feedDoPedido, type EntradaDoFeed } from './feed';

const ROTULO_DA_CATEGORIA: Record<EntradaDoFeed['categoria'], string> = {
  VENDEDOR: 'Observação do vendedor',
  FINANCEIRA: 'Observação financeira',
  DECISAO: 'Decisão do crédito',
  OUTRA: 'Observação',
};

const TOM: Record<EntradaDoFeed['categoria'], string> = {
  VENDEDOR: 'border-accent-link/40 text-accent-link',
  FINANCEIRA: 'border-canvas-dark/30 text-ink',
  DECISAO: 'border-[#b3242f]/40 text-[#b3242f]',
  OUTRA: 'border-hairline-light text-charcoal',
};

const ETAPA: Record<EtapaDoPedido, string> = {
  VENDEDOR: 'vendedor',
  GERENCIA_COMERCIAL: 'gerência comercial',
  CREDITO: 'crédito',
  FATURAMENTO: 'faturamento',
  EXPEDICAO: 'expedição',
};

function Nova({ aoObservar }: { readonly aoObservar: (texto: string) => Promise<void> }) {
  const [texto, setTexto] = useState('');
  const [enviando, setEnviando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const enviar = async () => {
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
    <div className="border-hairline-light bg-canvas-light shadow-cartao rounded-2xl border p-3">
      <label className="text-caption text-stone font-semibold uppercase tracking-[0.08em]">
        Nova observação financeira
        <textarea
          value={texto}
          onChange={(evento) => setTexto(evento.target.value)}
          rows={2}
          maxLength={1000}
          placeholder="Ex.: liberar só depois da confirmação do PIX da entrada."
          className="border-hairline-light text-body-sm text-ink placeholder:text-stone focus:border-hairline-strong mt-1.5 w-full resize-y rounded-xl border px-3 py-2 font-normal normal-case tracking-normal outline-none transition"
        />
      </label>
      <div className="mt-2 flex items-center justify-between gap-3">
        <span role="alert" className="text-caption text-[#b3242f]">
          {erro}
        </span>
        <button
          type="button"
          onClick={() => void enviar()}
          disabled={!texto.trim() || enviando}
          className={BOTAO_ESCURO}
        >
          <MessageSquarePlus size={15} aria-hidden="true" />
          {enviando ? 'Salvando…' : 'Adicionar'}
        </button>
      </div>
    </div>
  );
}

/** Feed do pedido: o que o vendedor escreveu, o que o financeiro anotou e as
 *  justificativas das decisoes, cada um com autor, etapa e horario. Nada e
 *  editado: o que foi escrito continua la. */
export function AbaObservacoes({
  pedido,
  aoObservar,
}: {
  readonly pedido: PedidoDeVenda;
  readonly aoObservar: (texto: string) => Promise<void>;
}) {
  const feed = feedDoPedido(pedido);
  return (
    <div className="grid gap-3">
      <Nova aoObservar={aoObservar} />
      {feed.length === 0 ? (
        <p className="text-body-sm text-stone py-6 text-center">Nenhuma observação neste pedido.</p>
      ) : (
        <ol className="grid gap-2">
          {feed.map((entrada) => (
            <li
              key={entrada.id}
              className="border-hairline-light bg-canvas-light rounded-xl border px-4 py-3"
            >
              <div className="flex flex-wrap items-center gap-2">
                <span
                  className={`text-caption inline-flex rounded-full border px-2 py-px font-semibold ${TOM[entrada.categoria]}`}
                >
                  {ROTULO_DA_CATEGORIA[entrada.categoria]}
                </span>
                <span className="text-body-sm text-ink font-semibold">{entrada.autor}</span>
                <span className="text-caption text-stone">etapa {ETAPA[entrada.etapa]}</span>
                <span className="text-caption text-stone ml-auto tabular-nums">
                  {formatarDataHora(entrada.em)}
                </span>
              </div>
              <p className="text-body-sm text-charcoal mt-1.5 whitespace-pre-line">
                {entrada.texto}
              </p>
            </li>
          ))}
        </ol>
      )}
    </div>
  );
}
