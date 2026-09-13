import type {
  AvaliacaoDoPedido,
  ComparacaoComHistorico,
  ParametrosDaAnalise,
  PedidoDeVenda,
} from '@synapse/types';
import { descricaoDoParcelamento, vencimentosDoPedido } from '@synapse/validation';
import { formatarMoeda, prazoDoPedido, ROTULO_DO_TIPO } from '../analise';
import { ROTULO_DA_NATUREZA } from '../rotulos';
import { Dado, Dados, Secao } from '../ui/Superficies';

const moeda = (valor: number | null | undefined) =>
  valor === null || valor === undefined ? null : formatarMoeda(valor);

function Pagamento({
  pedido,
  avaliacao,
}: {
  readonly pedido: PedidoDeVenda;
  readonly avaliacao: AvaliacaoDoPedido;
}) {
  const { exposicao } = avaliacao;
  const dias = vencimentosDoPedido(pedido);
  const semCobranca = exposicao.natureza === 'SEM_COBRANCA';
  return (
    <Secao titulo="Pagamento">
      <Dados colunas={4}>
        <Dado rotulo="Forma">{pedido.formaDePagamento}</Dado>
        <Dado rotulo="Condição">
          {semCobranca ? 'Sem cobrança' : descricaoDoParcelamento(dias)}
        </Dado>
        <Dado rotulo="Prazo médio">{prazoDoPedido(pedido)}</Dado>
        <Dado rotulo="Parcelas">{semCobranca ? '—' : `${dias.length}x`}</Dado>
        <Dado rotulo="Valor comercial">{formatarMoeda(exposicao.valorComercialCentavos)}</Dado>
        <Dado rotulo="Entrada" vazio="Sem entrada">
          {exposicao.entradaCentavos > 0 ? formatarMoeda(exposicao.entradaCentavos) : null}
        </Dado>
        <Dado rotulo="Valor financiado">{formatarMoeda(exposicao.financiadoCentavos)}</Dado>
        <Dado rotulo="Descontos">{formatarMoeda(pedido.descontoCentavos)}</Dado>
        <Dado rotulo="Frete" vazio="Sem frete">
          {(pedido.freteCentavos ?? 0) > 0 ? moeda(pedido.freteCentavos) : null}
        </Dado>
        <Dado rotulo="Acréscimos" vazio="Sem acréscimo">
          {(pedido.acrescimoCentavos ?? 0) > 0 ? moeda(pedido.acrescimoCentavos) : null}
        </Dado>
        <Dado rotulo="Natureza da cobrança">{ROTULO_DA_NATUREZA[exposicao.natureza]}</Dado>
        <Dado rotulo="Valor à vista" vazio="Não informado pelo vendedor" />
      </Dados>
      <p className="text-caption text-charcoal mt-3">{exposicao.explicacao}</p>
    </Secao>
  );
}

function Credito({ avaliacao }: { readonly avaliacao: AvaliacaoDoPedido }) {
  const { impacto } = avaliacao;
  const semLimite = impacto.limiteCentavos === null;
  return (
    <Secao titulo="Crédito do cliente">
      <Dados colunas={3}>
        <Dado rotulo="Limite" vazio="Sem cadastro">
          {moeda(impacto.limiteCentavos)}
        </Dado>
        <Dado rotulo="Comprometido">{formatarMoeda(impacto.comprometidoAntesCentavos)}</Dado>
        <Dado rotulo="Disponível" vazio={semLimite ? 'Sem limite' : '—'}>
          {moeda(impacto.disponivelAntesCentavos)}
        </Dado>
        <Dado rotulo="Exposição deste pedido">{formatarMoeda(impacto.exposicaoCentavos)}</Dado>
        <Dado rotulo="Disponível após aprovação" vazio={semLimite ? 'Sem limite' : '—'}>
          {moeda(impacto.disponivelDepoisCentavos)}
        </Dado>
      </Dados>
    </Secao>
  );
}

function Comparacao({
  pedido,
  comparacao,
  parametros,
}: {
  readonly pedido: PedidoDeVenda;
  readonly comparacao: ComparacaoComHistorico;
  readonly parametros: ParametrosDaAnalise;
}) {
  const minimo = parametros.minimoDePedidosParaComparar;
  if (!comparacao.aplicavel)
    return (
      <Secao titulo="Este pedido contra o habitual">
        <p className="text-body-sm text-stone">
          Não se aplica: {ROTULO_DO_TIPO[pedido.tipo].toLowerCase()} não é compra. O ticket médio e
          o prazo habitual comparam só vendas.
        </p>
      </Secao>
    );
  return (
    <Secao titulo="Este pedido contra o habitual">
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <p className="text-caption text-stone">Ticket médio (90 dias)</p>
          {comparacao.ticketMedioCentavos === null ? (
            <p className="text-body-sm text-stone italic">
              Histórico insuficiente: {comparacao.pedidosNoTicket} compra(s) em 90 dias (mínimo{' '}
              {minimo}).
            </p>
          ) : (
            <p className="text-body-sm text-ink">
              <strong className="tabular-nums">
                {formatarMoeda(comparacao.ticketMedioCentavos)}
              </strong>
              {' · pedido atual '}
              <strong className="tabular-nums">{formatarMoeda(pedido.totalCentavos)}</strong>
              <span className="text-charcoal">
                {' · '}
                {comparacao.razaoSobreTicket?.toLocaleString('pt-BR')}× o ticket médio
              </span>
            </p>
          )}
        </div>
        <div>
          <p className="text-caption text-stone">Prazo médio histórico (12 meses)</p>
          {comparacao.prazoMedioHistoricoDias === null ? (
            <p className="text-body-sm text-stone italic">
              Histórico insuficiente: {comparacao.pedidosNoPrazo} compra(s) a prazo em 12 meses
              (mínimo {minimo}).
            </p>
          ) : (
            <p className="text-body-sm text-ink">
              <strong className="tabular-nums">{comparacao.prazoMedioHistoricoDias} dias</strong>
              {' · solicitado '}
              <strong className="tabular-nums">{prazoDoPedido(pedido)}</strong>
              {comparacao.diferencaDePrazoDias !== null &&
                comparacao.diferencaDePrazoDias !== 0 && (
                  <span className="text-charcoal">
                    {' · '}
                    {comparacao.diferencaDePrazoDias > 0 ? '+' : ''}
                    {comparacao.diferencaDePrazoDias} dias
                  </span>
                )}
            </p>
          )}
        </div>
      </div>
    </Secao>
  );
}

export function AbaFinanceiro({
  pedido,
  avaliacao,
  parametros,
}: {
  readonly pedido: PedidoDeVenda;
  readonly avaliacao: AvaliacaoDoPedido | null;
  readonly parametros: ParametrosDaAnalise;
}) {
  if (!avaliacao)
    return <p className="text-body-sm text-stone">A avaliação financeira não está disponível.</p>;
  return (
    <div className="grid gap-3">
      <Pagamento pedido={pedido} avaliacao={avaliacao} />
      <Credito avaliacao={avaliacao} />
      <Comparacao pedido={pedido} comparacao={avaliacao.comparacao} parametros={parametros} />
    </div>
  );
}
