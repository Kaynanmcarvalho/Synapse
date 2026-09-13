import type { EventoDoPedido, TipoDeEvento, ValorRegistrado } from '@synapse/types';
import { ROTULO_DO_MOTIVO } from '@synapse/validation';
import {
  BadgeAlert,
  BadgeCheck,
  Bot,
  Eye,
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
import { formatarDataHora, formatarMoeda, formatarPercentual } from '../analise';
import { eventosEmOrdem, ROTULO_DO_EVENTO } from '../pedido/rotulos';
import { EtiquetaDaEtapa } from '../ui/Etiquetas';

const ICONE: Record<TipoDeEvento, LucideIcon> = {
  LANCADO: Send,
  ANALISE_ACIONADA: Bot,
  EDITADO: FilePen,
  IMPRESSO: Printer,
  VISUALIZADO: Eye,
  OBSERVACAO: MessageSquare,
  LIBERADO: BadgeCheck,
  LIBERADO_EXCECAO: BadgeAlert,
  REPROVADO: XCircle,
  FATURADO: FileText,
  EM_ROTA: Truck,
  ENTREGUE: PackageCheck,
};

const formatarValor = (valor: number | null, unidade: ValorRegistrado['unidade']): string => {
  if (valor === null) return '—';
  if (unidade === 'centavos') return formatarMoeda(valor);
  if (unidade === 'percentual') return formatarPercentual(valor);
  return `${valor} dias`;
};

function Valores({ valores }: { readonly valores: readonly ValorRegistrado[] }) {
  return (
    <dl className="border-hairline-light bg-surface-soft mt-1.5 grid gap-0.5 rounded-lg border px-3 py-2">
      {valores.map((valor) => (
        <div key={valor.campo} className="text-caption flex flex-wrap justify-between gap-x-3">
          <dt className="text-stone">{valor.rotulo}</dt>
          <dd className="text-charcoal font-semibold tabular-nums">
            {valor.antes === null || valor.antes === valor.depois
              ? formatarValor(valor.depois, valor.unidade)
              : `${formatarValor(valor.antes, valor.unidade)} → ${formatarValor(valor.depois, valor.unidade)}`}
          </dd>
        </div>
      ))}
    </dl>
  );
}

function Evento({ evento }: { readonly evento: EventoDoPedido }) {
  const Icone = ICONE[evento.tipo];
  const excecao = evento.tipo === 'LIBERADO_EXCECAO' || evento.tipo === 'REPROVADO';
  return (
    <li className="relative pb-4 last:pb-0">
      <span
        className={`bg-canvas-light absolute -left-[37px] flex h-7 w-7 items-center justify-center rounded-full border ${
          excecao ? 'border-[#b3242f]/40 text-[#b3242f]' : 'border-hairline-light text-ink'
        }`}
      >
        <Icone size={14} aria-hidden="true" />
      </span>
      <p className="text-caption text-stone tabular-nums">
        {formatarDataHora(evento.em)} · <strong className="text-charcoal">{evento.porNome}</strong>
      </p>
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-body-sm text-ink font-semibold">{ROTULO_DO_EVENTO[evento.tipo]}</span>
        <EtiquetaDaEtapa etapa={evento.etapa} />
      </div>
      {evento.detalhe && <p className="text-body-sm text-mute">{evento.detalhe}</p>}
      {evento.justificativa && (
        <blockquote className="border-hairline-strong/30 text-body-sm text-ink mt-1 border-l-2 pl-3">
          Justificativa: {evento.justificativa}
        </blockquote>
      )}
      {evento.motivos && evento.motivos.length > 0 && evento.tipo !== 'ANALISE_ACIONADA' && (
        <p className="text-caption text-stone mt-1">
          Motivos na hora: {evento.motivos.map((codigo) => ROTULO_DO_MOTIVO[codigo]).join(', ')}
        </p>
      )}
      {evento.valores && evento.valores.length > 0 && <Valores valores={evento.valores} />}
    </li>
  );
}

/** A auditoria da analise: quem fez o que, quando, com os numeros de antes e
 *  depois e a justificativa quando houve. Do mais recente para o mais antigo. */
export function AbaHistorico({ historico }: { readonly historico: readonly EventoDoPedido[] }) {
  const eventos = eventosEmOrdem(historico ?? []);
  if (eventos.length === 0)
    return (
      <p className="text-body-sm text-stone py-6 text-center">
        Este pedido ainda não tem eventos registrados.
      </p>
    );
  return (
    <ol className="border-hairline-light relative ml-4 border-l pl-6">
      {eventos.map((evento, indice) => (
        <Evento key={`${evento.tipo}-${evento.em}-${indice}`} evento={evento} />
      ))}
    </ol>
  );
}
