import type { AcaoDeCredito, AvaliacaoDoPedido, PedidoDeVenda } from '@synapse/types';
import { BadgeAlert, BadgeCheck, CircleCheck, TriangleAlert, XCircle } from 'lucide-react';
import { ROTULO_DA_SITUACAO } from '../analise';
import { BOTAO_ALERTA, BOTAO_ESCURO, BOTAO_REPROVAR } from '../ui/Superficies';

function Estado({
  pedido,
  avaliacao,
}: {
  readonly pedido: PedidoDeVenda;
  readonly avaliacao: AvaliacaoDoPedido | null;
}) {
  if (pedido.situacao !== 'AGUARDANDO_ANALISE')
    return (
      <p className="text-body-sm text-charcoal">
        Pedido já decidido: <strong>{ROTULO_DA_SITUACAO[pedido.situacao]}</strong>.
      </p>
    );
  if (!avaliacao) return <p className="text-body-sm text-stone">Avaliação indisponível.</p>;
  if (!avaliacao.violaPolitica)
    return (
      <p className="text-body-sm text-accent-green-text flex items-center gap-1.5">
        <CircleCheck size={15} aria-hidden="true" /> Dentro da política de crédito
      </p>
    );
  const violados = avaliacao.motivos.filter((motivo) => motivo.violaPolitica);
  return (
    <p className="text-body-sm flex min-w-0 items-center gap-1.5 text-[#b3242f]">
      <TriangleAlert size={15} aria-hidden="true" className="shrink-0" />
      <span className="truncate">
        Fora da política: {violados.map((motivo) => motivo.rotulo.toLowerCase()).join(', ')}
      </span>
    </p>
  );
}

/** Rodape fixo da analise: o estado frente a politica e as decisoes que
 *  funcionam de ponta a ponta — reprovar, aprovar e aprovar excepcionalmente. */
export function AcoesDaDecisao({
  pedido,
  avaliacao,
  aoEscolher,
}: {
  readonly pedido: PedidoDeVenda;
  readonly avaliacao: AvaliacaoDoPedido | null;
  readonly aoEscolher: (acao: AcaoDeCredito) => void;
}) {
  const decidivel = pedido.situacao === 'AGUARDANDO_ANALISE' && avaliacao !== null;
  const excecao = avaliacao?.violaPolitica ?? false;
  return (
    <div className="border-hairline-light bg-canvas-light flex shrink-0 flex-wrap items-center gap-3 border-t px-4 py-3">
      <div className="min-w-0 flex-1">
        <Estado pedido={pedido} avaliacao={avaliacao} />
      </div>
      <button
        type="button"
        onClick={() => aoEscolher('REPROVAR')}
        disabled={!decidivel}
        className={BOTAO_REPROVAR}
      >
        <XCircle size={15} aria-hidden="true" /> Reprovar
      </button>
      {excecao ? (
        <button
          type="button"
          onClick={() => aoEscolher('APROVAR_EXCECAO')}
          disabled={!decidivel}
          className={BOTAO_ALERTA}
        >
          <BadgeAlert size={15} aria-hidden="true" /> Aprovar excepcionalmente
        </button>
      ) : (
        <button
          type="button"
          onClick={() => aoEscolher('APROVAR')}
          disabled={!decidivel}
          className={BOTAO_ESCURO}
        >
          <BadgeCheck size={15} aria-hidden="true" /> Aprovar pedido
        </button>
      )}
    </div>
  );
}
