import type { EventoDoPedido, TipoDeEvento } from '@synapse/types';
import {
  BadgeCheck,
  Check,
  FilePen,
  FileText,
  MessageSquare,
  PackageCheck,
  Printer,
  Send,
  Truck,
  XCircle,
  type LucideIcon,
} from 'lucide-react';
import { formatarDataHora } from '../analise';
import { EtiquetaDaEtapa } from './AbaObservacoes';
import { eventosEmOrdem, marcosDoPedido, ROTULO_DO_EVENTO } from './rotulos';

const ICONE_DO_EVENTO: Record<TipoDeEvento, LucideIcon> = {
  LANCADO: Send,
  EDITADO: FilePen,
  IMPRESSO: Printer,
  OBSERVACAO: MessageSquare,
  LIBERADO: BadgeCheck,
  REPROVADO: XCircle,
  FATURADO: FileText,
  EM_ROTA: Truck,
  ENTREGUE: PackageCheck,
};

/** Os cinco marcos do caminho, lado a lado: o que ja passou fica cheio, o que
 *  falta fica vazado. Da para saber em que ponto o pedido esta de relance. */
function Marcos({ historico }: { readonly historico: readonly EventoDoPedido[] }) {
  const marcos = marcosDoPedido(historico);
  return (
    <ol className="border-hairline-light bg-canvas-light shadow-cartao grid grid-cols-5 gap-2 rounded-2xl border p-4">
      {marcos.map((marco, indice) => {
        const feito = marco.evento !== null;
        const proximoFeito = marcos[indice + 1]?.evento != null;
        return (
          <li key={marco.tipo} className="relative flex flex-col items-center text-center">
            {indice < marcos.length - 1 && (
              <span
                aria-hidden="true"
                className={`absolute left-1/2 top-4 h-0.5 w-full ${proximoFeito ? 'bg-canvas-dark' : 'bg-hairline-light'}`}
              />
            )}
            <span
              className={`relative z-[1] flex h-8 w-8 items-center justify-center rounded-full border-2 transition ${
                feito
                  ? 'border-canvas-dark bg-canvas-dark text-white'
                  : 'border-hairline-light bg-canvas-light text-faint'
              }`}
            >
              {feito ? <Check size={14} strokeWidth={3} aria-hidden="true" /> : indice + 1}
            </span>
            <span
              className={`text-caption mt-2 font-semibold ${feito ? 'text-ink' : 'text-stone'}`}
            >
              {marco.rotulo}
            </span>
            <span className="text-caption text-stone tabular-nums">
              {marco.evento ? formatarDataHora(marco.evento.em) : 'Aguardando'}
            </span>
            {marco.evento && (
              <span className="text-caption text-charcoal truncate">{marco.evento.porNome}</span>
            )}
          </li>
        );
      })}
    </ol>
  );
}

/** Rastro completo do pedido: quem lancou, quem editou, quem liberou no credito,
 *  quem faturou e quando foi entregue — do mais recente para o mais antigo. */
export function AbaHistorico({ historico }: { readonly historico: readonly EventoDoPedido[] }) {
  const eventos = eventosEmOrdem(historico ?? []);

  return (
    <div className="grid gap-4">
      <Marcos historico={historico ?? []} />

      {eventos.length === 0 ? (
        <p className="text-body-sm text-stone py-6 text-center">
          Este pedido ainda não tem eventos registrados.
        </p>
      ) : (
        <ol className="border-hairline-light relative ml-4 border-l pl-6">
          {eventos.map((evento, indice) => {
            const Icone = ICONE_DO_EVENTO[evento.tipo];
            return (
              <li
                key={`${evento.tipo}-${evento.em}-${indice}`}
                style={{ animationDelay: `${indice * 40}ms` }}
                className="animate-subir relative pb-5 last:pb-0 motion-reduce:animate-none"
              >
                <span className="border-hairline-light bg-canvas-light shadow-cartao text-ink absolute -left-[41px] flex h-8 w-8 items-center justify-center rounded-full border">
                  <Icone size={15} aria-hidden="true" />
                </span>
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-body-md text-ink font-semibold">
                    {ROTULO_DO_EVENTO[evento.tipo]}
                  </span>
                  <EtiquetaDaEtapa etapa={evento.etapa} />
                </div>
                <p className="text-body-sm text-charcoal mt-0.5">
                  <strong className="font-semibold">{evento.porNome}</strong>
                  <span className="text-stone"> · {formatarDataHora(evento.em)}</span>
                </p>
                {evento.detalhe && <p className="text-body-sm text-mute mt-1">{evento.detalhe}</p>}
              </li>
            );
          })}
        </ol>
      )}
    </div>
  );
}
