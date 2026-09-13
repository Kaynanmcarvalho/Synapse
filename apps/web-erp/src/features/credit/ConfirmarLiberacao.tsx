import type { AvaliacaoDoPedido, PedidoDeVenda } from '@synapse/types';
import { JUSTIFICATIVA_MINIMA, type AvaliacaoDoLote } from '@synapse/validation';
import { CheckCheck } from 'lucide-react';
import { useState, type ReactNode } from 'react';
import { CampoDeJustificativa } from './ui/CampoDeJustificativa';
import { formatarMoeda, formatarPercentual, ROTULO_DO_TIPO } from './analise';
import { pagamentoDoPedido } from './fila/filtros';
import { Motivos } from './ui/Etiquetas';
import { BOTAO_ALERTA, BOTAO_CLARO, BOTAO_ESCURO, Dialogo } from './ui/Superficies';

function Item({
  pedido,
  avaliacao,
  excepcional,
}: {
  readonly pedido: PedidoDeVenda;
  readonly avaliacao: AvaliacaoDoPedido | undefined;
  readonly excepcional: boolean;
}) {
  return (
    <li className="flex items-start gap-3 px-4 py-2.5">
      <span className="min-w-0 flex-1">
        <span className="text-body-sm text-ink block font-semibold">
          Pedido {pedido.numero} · {ROTULO_DO_TIPO[pedido.tipo]}
        </span>
        <span className="text-caption text-stone block truncate">{pagamentoDoPedido(pedido)}</span>
        {excepcional && avaliacao && (
          <span className="mt-1 block">
            <Motivos motivos={avaliacao.motivos.filter((motivo) => motivo.violaPolitica)} />
          </span>
        )}
      </span>
      <span className="text-right">
        <span className="text-body-sm text-ink block font-semibold tabular-nums">
          {formatarMoeda(pedido.totalCentavos)}
        </span>
        <span className="text-caption text-stone block tabular-nums">
          exposição {formatarMoeda(avaliacao?.exposicao.exposicaoCentavos ?? 0)}
        </span>
      </span>
    </li>
  );
}

function Numero({ rotulo, children }: { readonly rotulo: string; readonly children: ReactNode }) {
  return (
    <div>
      <dt className="text-caption text-stone">{rotulo}</dt>
      <dd className="text-ink font-semibold tabular-nums">{children}</dd>
    </div>
  );
}

function Totais({ lote }: { readonly lote: AvaliacaoDoLote }) {
  return (
    <dl className="text-body-sm mt-3 grid grid-cols-3 gap-2 px-1">
      <Numero rotulo="Valor comercial">{formatarMoeda(lote.valorComercialCentavos)}</Numero>
      <Numero rotulo="Impacto em crédito">{formatarMoeda(lote.exposicaoCentavos)}</Numero>
      <Numero rotulo="Disponível depois">
        {lote.disponivelDepoisCentavos === null
          ? 'Sem limite'
          : formatarMoeda(lote.disponivelDepoisCentavos)}
        {lote.utilizacaoDepoisPercentual !== null && (
          <span className="text-caption text-stone font-normal">
            {' '}
            · {formatarPercentual(lote.utilizacaoDepoisPercentual)}
          </span>
        )}
      </Numero>
    </dl>
  );
}

/** Aprovar manda para o faturamento: a confirmacao lista cada pedido com o
 *  valor comercial e a exposicao, e o que sobra do limite. Se algum ficar fora
 *  da politica, a justificativa e obrigatoria e vale para esses. */
export function ConfirmarLiberacao({
  cliente,
  pedidos,
  avaliacoes,
  lote,
  aoConfirmar,
  aoCancelar,
}: {
  readonly cliente: string;
  readonly pedidos: readonly PedidoDeVenda[];
  readonly avaliacoes: readonly AvaliacaoDoPedido[];
  readonly lote: AvaliacaoDoLote;
  readonly aoConfirmar: (justificativa: string | null) => void;
  readonly aoCancelar: () => void;
}) {
  const [justificativa, setJustificativa] = useState('');
  const excepcionais = new Set(lote.excepcionais);
  const exige = excepcionais.size > 0;
  const valida = justificativa.trim().length >= JUSTIFICATIVA_MINIMA;
  const porPedido = new Map(avaliacoes.map((avaliacao) => [avaliacao.pedidoId, avaliacao]));
  const titulo = `Aprovar ${pedidos.length > 1 ? `${pedidos.length} pedidos` : 'o pedido'} de ${cliente}?`;

  return (
    <Dialogo rotulo={titulo} aoFechar={aoCancelar} largura="max-w-lg">
      <span className="bg-surface-soft text-ink flex h-11 w-11 items-center justify-center rounded-full">
        <CheckCheck size={20} aria-hidden="true" />
      </span>
      <h2 className="font-display text-heading-sm text-ink mt-3">{titulo}</h2>
      <p className="text-body-sm text-mute mt-1">
        Eles saem da análise e seguem para o faturamento. A aprovação fica no histórico de cada
        pedido, com o seu nome, o horário e os números do limite.
      </p>
      <ul className="border-hairline-light divide-hairline-light mt-4 divide-y rounded-xl border">
        {pedidos.map((pedido) => (
          <Item
            key={pedido.id}
            pedido={pedido}
            avaliacao={porPedido.get(pedido.id)}
            excepcional={excepcionais.has(pedido.id)}
          />
        ))}
      </ul>
      <Totais lote={lote} />
      {exige && (
        <CampoDeJustificativa
          rotulo={`${excepcionais.size} pedido(s) fora da política — justificativa obrigatória`}
          valor={justificativa}
          aoMudar={setJustificativa}
        />
      )}
      <div className="mt-5 flex justify-end gap-2">
        <button type="button" onClick={aoCancelar} className={BOTAO_CLARO}>
          Cancelar
        </button>
        <button
          type="button"
          data-autofoco={exige ? undefined : true}
          onClick={() => aoConfirmar(exige ? justificativa.trim() : null)}
          disabled={exige && !valida}
          className={exige ? BOTAO_ALERTA : BOTAO_ESCURO}
        >
          {exige ? 'Aprovar com justificativa' : 'Aprovar e enviar ao faturamento'}
        </button>
      </div>
    </Dialogo>
  );
}
