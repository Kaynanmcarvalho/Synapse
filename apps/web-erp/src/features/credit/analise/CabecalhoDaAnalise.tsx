import type { AvaliacaoDoPedido, PedidoDeVenda } from '@synapse/types';
import { Clock3 } from 'lucide-react';
import type { ReactNode } from 'react';
import {
  formatarDataHora,
  ROTULO_DA_ORIGEM,
  ROTULO_DA_SITUACAO,
  ROTULO_DO_TIPO,
  tempoAguardando,
} from '../analise';
import { Motivos } from '../ui/Etiquetas';

function Item({ rotulo, children }: { readonly rotulo: string; readonly children: ReactNode }) {
  return (
    <span className="flex min-w-0 flex-col">
      <span className="text-caption text-stone">{rotulo}</span>
      <span className="text-body-sm text-ink truncate font-semibold tabular-nums">{children}</span>
    </span>
  );
}

/** O que o analista precisa ver antes de rolar: que operacao e, desde quando
 *  espera, de onde veio e — em destaque — por que esta em analise. */
export function CabecalhoDaAnalise({
  pedido,
  avaliacao,
}: {
  readonly pedido: PedidoDeVenda;
  readonly avaliacao: AvaliacaoDoPedido | null;
}) {
  const noEnvio = pedido.analiseNoEnvio;
  const aguardando = pedido.situacao === 'AGUARDANDO_ANALISE';
  return (
    <div className="border-hairline-light bg-canvas-light shrink-0 border-b px-4 py-3">
      <div className="flex flex-wrap items-end gap-x-6 gap-y-2">
        <Item rotulo="Tipo">{ROTULO_DO_TIPO[pedido.tipo]}</Item>
        <Item rotulo="Situação">{ROTULO_DA_SITUACAO[pedido.situacao]}</Item>
        <Item rotulo="Enviado para análise">{formatarDataHora(pedido.enviadoEm)}</Item>
        {aguardando && (
          <Item rotulo="Aguardando há">
            <span className="inline-flex items-center gap-1">
              <Clock3 size={13} aria-hidden="true" />
              {tempoAguardando(pedido.enviadoEm)}
            </span>
          </Item>
        )}
        <Item rotulo="Origem">{ROTULO_DA_ORIGEM[pedido.origem]}</Item>
      </div>
      <div className="mt-2.5 flex flex-wrap items-center gap-2">
        <span className="text-caption text-charcoal font-semibold uppercase tracking-[0.06em]">
          Motivo da análise
        </span>
        {avaliacao ? (
          <Motivos motivos={avaliacao.motivos} />
        ) : (
          <span className="text-caption text-stone">Avaliação indisponível</span>
        )}
      </div>
      <p className="text-caption text-stone mt-1">
        {noEnvio
          ? `Avaliação atual. No envio, em ${formatarDataHora(noEnvio.avaliadaEm)}, o Synapse registrou: ${noEnvio.motivos.map((motivo) => motivo.rotulo.toLowerCase()).join(', ')}.`
          : 'Avaliação atual. Este pedido chegou antes do registro automático de motivos no envio.'}
      </p>
    </div>
  );
}
