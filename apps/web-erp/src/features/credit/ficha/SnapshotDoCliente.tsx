import type { PainelDeAnaliseDeCredito } from '@synapse/types';
import type { AvaliacaoDoLote } from '@synapse/validation';
import { UserRound } from 'lucide-react';
import { formatarData, formatarDocumento, formatarMoeda, formatarPercentual } from '../analise';
import { BOTAO_CLARO } from '../ui/Superficies';

type Tom = 'neutro' | 'alerta' | 'destaque';

const COR: Record<Tom, string> = {
  neutro: 'text-ink',
  alerta: 'text-[#b3242f]',
  destaque: 'text-primary-deep',
};

function Principal({
  rotulo,
  valor,
  apoio,
  tom = 'neutro',
}: {
  readonly rotulo: string;
  readonly valor: string;
  readonly apoio?: string | undefined;
  readonly tom?: Tom;
}) {
  return (
    <div className="min-w-0 px-3 first:pl-0">
      <dt className="text-caption text-stone truncate">{rotulo}</dt>
      <dd
        className={`font-display text-[19px] tabular-nums leading-7 tracking-[-0.2px] ${COR[tom]}`}
      >
        {valor}
      </dd>
      {apoio && (
        <dd className="text-caption text-stone truncate" title={apoio}>
          {apoio}
        </dd>
      )}
    </div>
  );
}

function Secundario({ rotulo, valor }: { readonly rotulo: string; readonly valor: string }) {
  return (
    <span className="text-caption text-stone whitespace-nowrap">
      {rotulo} <strong className="text-charcoal font-semibold tabular-nums">{valor}</strong>
    </span>
  );
}

const moedaOu = (valor: number | null, vazio: string) =>
  valor === null ? vazio : formatarMoeda(valor);

const dias = (valor: number | null) =>
  valor === null ? '—' : `${valor.toLocaleString('pt-BR')} ${valor === 1 ? 'dia' : 'dias'}`;

const tomDoSaldo = (valor: number | null, positivo: Tom = 'neutro'): Tom =>
  (valor ?? 0) < 0 ? 'alerta' : positivo;

/** O que decide: limite, disponivel, em aberto, vencido, exposicao em analise e
 *  o disponivel depois dos pedidos selecionados. */
function Principais({
  dados,
  lote,
}: {
  readonly dados: PainelDeAnaliseDeCredito;
  readonly lote: AvaliacaoDoLote;
}) {
  const { situacao, avaliacoes } = dados;
  const semLimite = situacao.limiteCentavos === null ? 'Sem limite' : '—';
  const exposicao = avaliacoes.reduce((soma, item) => soma + item.exposicao.exposicaoCentavos, 0);
  const aprovados = situacao.aprovadosNaoFaturadosCentavos;
  const vencidos = situacao.titulosVencidos;
  return (
    <dl className="divide-hairline-light mt-2 grid grid-cols-2 gap-y-3 divide-x sm:grid-cols-3 xl:grid-cols-6">
      <Principal
        rotulo="Limite de crédito"
        valor={moedaOu(situacao.limiteCentavos, 'Sem cadastro')}
        apoio={situacao.limiteCentavos === 0 ? 'nenhum limite concedido' : undefined}
      />
      <Principal
        rotulo="Limite disponível"
        valor={moedaOu(situacao.disponivelCentavos, semLimite)}
        tom={tomDoSaldo(situacao.disponivelCentavos)}
        apoio={aprovados > 0 ? `já desconta ${formatarMoeda(aprovados)} aprovados` : undefined}
      />
      <Principal rotulo="Total em aberto" valor={formatarMoeda(situacao.emAbertoCentavos)} />
      <Principal
        rotulo="Total vencido"
        valor={formatarMoeda(situacao.vencidoCentavos)}
        tom={situacao.vencidoCentavos > 0 ? 'alerta' : 'neutro'}
        apoio={
          vencidos > 0
            ? `${vencidos} título(s), até ${dias(situacao.diasDeAtrasoMaximo)}`
            : 'nenhum título vencido'
        }
      />
      <Principal
        rotulo="Exposição em análise"
        valor={formatarMoeda(exposicao)}
        apoio={`de ${formatarMoeda(dados.totalEmAnaliseCentavos)} em pedidos`}
      />
      <Principal
        rotulo="Disponível após selecionados"
        valor={moedaOu(lote.disponivelDepoisCentavos, semLimite)}
        tom={tomDoSaldo(lote.disponivelDepoisCentavos, 'destaque')}
        apoio={
          lote.utilizacaoDepoisPercentual === null
            ? `${lote.itens.length} selecionado(s)`
            : `utilização ${formatarPercentual(lote.utilizacaoDepoisPercentual)}`
        }
      />
    </dl>
  );
}

/** O comportamento em linha, com o periodo dito no rotulo. */
function Secundarios({ dados }: { readonly dados: PainelDeAnaliseDeCredito }) {
  const { comportamento } = dados;
  const doze = comportamento.janelas['12M'];
  const pontualidade =
    comportamento.historicoSuficiente && doze.pontualidade.percentualNoPrazo !== null
      ? formatarPercentual(doze.pontualidade.percentualNoPrazo)
      : 'histórico insuficiente';
  return (
    <div className="mt-2.5 flex flex-wrap gap-x-5 gap-y-1">
      <Secundario rotulo="Pago em 12 meses" valor={formatarMoeda(doze.pontualidade.pagoCentavos)} />
      <Secundario rotulo="Títulos considerados" valor={`${comportamento.titulosConsiderados}`} />
      <Secundario rotulo="Pontualidade (12 meses)" valor={pontualidade} />
      <Secundario rotulo="Atraso médio" valor={dias(doze.pontualidade.atrasoMedioDias)} />
      <Secundario rotulo="Maior atraso" valor={dias(doze.pontualidade.maiorAtrasoDias)} />
      <Secundario
        rotulo="Última compra"
        valor={
          comportamento.ultimaCompraEm ? formatarData(comportamento.ultimaCompraEm) : 'nenhuma'
        }
      />
      <Secundario rotulo="Prazo médio histórico" valor={dias(doze.compras.prazoMedioDias)} />
    </div>
  );
}

/** O retrato de credito no topo da ficha: o que decide em destaque, o
 *  comportamento em linha embaixo. */
export function SnapshotDoCliente({
  dados,
  lote,
  aoAbrirCadastro,
}: {
  readonly dados: PainelDeAnaliseDeCredito;
  readonly lote: AvaliacaoDoLote;
  readonly aoAbrirCadastro: () => void;
}) {
  const { cliente } = dados;
  return (
    <div className="border-hairline-light border-b px-4 pb-3 pt-3">
      <div className="flex flex-wrap items-center gap-x-4 gap-y-1">
        <span className="text-body-sm text-charcoal tabular-nums">
          {formatarDocumento(cliente.documento) || 'Sem CPF/CNPJ'}
          {cliente.codigo ? ` · cód. ${cliente.codigo}` : ' · sem código'}
          {cliente.cidade ? ` · ${cliente.cidade}` : ''}
        </span>
        <button type="button" onClick={aoAbrirCadastro} className={`${BOTAO_CLARO} ml-auto h-8`}>
          <UserRound size={14} aria-hidden="true" /> Cadastro do cliente
        </button>
      </div>
      <Principais dados={dados} lote={lote} />
      <Secundarios dados={dados} />
    </div>
  );
}
