import type {
  AcaoDeCredito,
  AvaliacaoDoPedido,
  PedidoDeVenda,
  PermissoesDaDecisao,
} from '@synapse/types';
import { BadgeAlert, BadgeCheck, CircleCheck, Lock, TriangleAlert, XCircle } from 'lucide-react';
import { ROTULO_DA_SITUACAO } from '../analise';
import { BOTAO_ALERTA, BOTAO_ESCURO, BOTAO_REPROVAR } from '../ui/Superficies';
import { capacidadeDaDecisao } from './capacidade';

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

const ID_DO_AVISO = 'aviso-de-permissao-da-decisao';

function Aviso({ avisos }: { readonly avisos: readonly string[] }) {
  if (avisos.length === 0) return null;
  return (
    <p
      id={ID_DO_AVISO}
      role="note"
      className="text-caption mt-1 flex items-start gap-1.5 text-[#8a4b00]"
    >
      <Lock size={13} aria-hidden="true" className="mt-0.5 shrink-0" />
      <span>{avisos.join(' ')}</span>
    </p>
  );
}

/** Rodape fixo da analise: o estado frente a politica e as decisoes que
 *  funcionam de ponta a ponta — reprovar, aprovar e aprovar excepcionalmente.
 *  Sem a permissao da decisao, o botao ja chega desabilitado e o motivo fica
 *  escrito ao lado: nada de descobrir pelo erro depois do clique. */
export function AcoesDaDecisao({
  pedido,
  avaliacao,
  permissoes,
  aoEscolher,
}: {
  readonly pedido: PedidoDeVenda;
  readonly avaliacao: AvaliacaoDoPedido | null;
  readonly permissoes: PermissoesDaDecisao;
  readonly aoEscolher: (acao: AcaoDeCredito) => void;
}) {
  const capacidade = capacidadeDaDecisao(pedido, avaliacao, permissoes);
  const excecao = capacidade.aprovacao === 'APROVAR_EXCECAO';
  const explicado = capacidade.avisos.length > 0 ? ID_DO_AVISO : undefined;
  return (
    <div className="border-hairline-light bg-canvas-light flex shrink-0 flex-wrap items-center gap-3 border-t px-4 py-3">
      <div className="min-w-0 flex-1">
        <Estado pedido={pedido} avaliacao={avaliacao} />
        <Aviso avisos={capacidade.avisos} />
      </div>
      <button
        type="button"
        onClick={() => aoEscolher('REPROVAR')}
        disabled={!capacidade.podeReprovar}
        aria-describedby={capacidade.podeReprovar ? undefined : explicado}
        className={BOTAO_REPROVAR}
      >
        <XCircle size={15} aria-hidden="true" /> Reprovar
      </button>
      <button
        type="button"
        onClick={() => aoEscolher(capacidade.aprovacao)}
        disabled={!capacidade.podeAprovar}
        aria-describedby={capacidade.podeAprovar ? undefined : explicado}
        className={excecao ? BOTAO_ALERTA : BOTAO_ESCURO}
      >
        {excecao ? (
          <>
            <BadgeAlert size={15} aria-hidden="true" /> Aprovar excepcionalmente
          </>
        ) : (
          <>
            <BadgeCheck size={15} aria-hidden="true" /> Aprovar pedido
          </>
        )}
      </button>
    </div>
  );
}
