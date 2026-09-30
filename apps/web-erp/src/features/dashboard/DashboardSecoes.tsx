import { classesDaLinha, DataGridCabecalho, DataGridCelula, Text } from '@synapse/sdl';
import { Link } from 'react-router-dom';
import { CelulaDeDinheiro } from '../../components/datagrid/CelulaDeDinheiro';
import { Indicador } from '../../components/indicadores/Indicador';
import { formatarData, formatarMoeda } from '../customers/formato';
import type { Dashboard } from './dashboard.types';
import { RankingDeFiliais } from './RankingDeFiliais';

/** Faixa de indicadores do período + Meta mensal (só perfil vendedor). */
function ResultadosDoPeriodo({
  cards,
  from,
  to,
  branchId,
  profile,
  monthlyGoalCentavos,
}: {
  readonly cards: ReadonlyArray<readonly [string, string]>;
  readonly from: string;
  readonly to: string;
  readonly branchId: string;
  readonly profile: string;
  readonly monthlyGoalCentavos: number | null;
}) {
  return (
    <section aria-label="Resultados do período">
      <Text variant="tituloSecao">Resultados do período</Text>
      <Text variant="legenda" tone="sutil" className="mt-1 block">
        {formatarData(from)} a {formatarData(to)}
        {branchId.trim() ? ` · filial ${branchId.trim()}` : ''}
      </Text>
      <div className="mt-3 flex flex-wrap items-start gap-y-4">
        <dl className="divide-hairline-light flex flex-wrap divide-x">
          {cards.map(([label, value]) => (
            <Indicador key={label} rotulo={label} valor={value} />
          ))}
        </dl>
        {profile === 'seller' && monthlyGoalCentavos !== null && (
          <div className="border-line-fina ml-6 border-l pl-6">
            <Indicador
              rotulo="Meta mensal"
              valor={formatarMoeda(monthlyGoalCentavos)}
              apoio="Meta do mês corrente — não segue o período acima"
            />
          </div>
        )}
      </div>
    </section>
  );
}

/** Tabela comparativa entre filiais — Fase 5.4 migrou para a fundação de
 *  DataGrid; Fase 7.2 só isolou em componente e trocou a legenda de lugar,
 *  cálculos e colunas continuam intocados. */
function ComparativoDeFiliais({ branches }: { readonly branches: Dashboard['branches'] }) {
  return (
    <section aria-label="Comparativo entre filiais">
      <Text variant="tituloSecao">Comparativo entre filiais</Text>
      <Text variant="corpoSecundario" className="mt-1 block">
        Vendas e Faturamento seguem o período selecionado; A receber, A pagar e Vencidos são a
        posição atual (último cálculo, independente do período).
      </Text>
      <div className="mt-3 overflow-x-auto">
        <table className="w-full min-w-[720px] border-collapse text-left">
          <thead>
            <tr className="border-hairline-light bg-surface-soft border-b">
              <DataGridCabecalho id="filial" rotulo="Filial" />
              <DataGridCabecalho id="vendas" rotulo="Vendas" alinhamento="direita" />
              <DataGridCabecalho id="faturamento" rotulo="Faturamento" alinhamento="direita" />
              <DataGridCabecalho id="receber" rotulo="A receber" alinhamento="direita" />
              <DataGridCabecalho id="pagar" rotulo="A pagar" alinhamento="direita" />
              <DataGridCabecalho id="vencidos" rotulo="Vencidos" alinhamento="direita" />
            </tr>
          </thead>
          <tbody>
            {branches.map((b) => (
              <tr
                key={b.branchId}
                className={classesDaLinha({ clicavel: false, focoComAnel: false })}
              >
                <DataGridCelula papel="primary" truncar={false}>
                  <Text variant="corpo" className="font-medium">
                    {b.branchId}
                  </Text>
                </DataGridCelula>
                <DataGridCelula papel="data" alinhamento="direita" truncar={false}>
                  <Text variant="dado">{b.sales}</Text>
                </DataGridCelula>
                <CelulaDeDinheiro
                  truncar={false}
                  peso="forte"
                  valorFormatado={formatarMoeda(b.revenueCentavos)}
                />
                <CelulaDeDinheiro
                  truncar={false}
                  valorFormatado={formatarMoeda(b.receivableCentavos ?? 0)}
                />
                <CelulaDeDinheiro
                  truncar={false}
                  valorFormatado={formatarMoeda(b.payableCentavos ?? 0)}
                />
                <CelulaDeDinheiro
                  truncar={false}
                  peso={b.overdueCentavos ? 'normal' : 'apagado'}
                  valorFormatado={formatarMoeda(b.overdueCentavos ?? 0)}
                />
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}

/** Posição atual de estoque por filial — independente do período. */
function EstoqueAtual({ stock }: { readonly stock: Dashboard['stock'] }) {
  return (
    <section aria-label="Estoque atual">
      <Text variant="tituloSecao">Estoque atual</Text>
      <Text variant="legenda" tone="sutil" className="mt-1 block">
        Posição atual, independente do período selecionado.
      </Text>
      <dl className="divide-hairline-light mt-3 divide-y">
        {stock.map((b) => (
          <div key={b.branchId} className="flex flex-wrap items-baseline gap-x-6 py-2">
            <Text variant="corpo" as="dt" className="w-48 shrink-0 truncate font-medium">
              {b.branchId}
            </Text>
            <Text variant="dado" as="dd">
              {b.available} unidades disponíveis
            </Text>
            <Text
              variant="dado"
              as="dd"
              {...(b.outOfStock > 0 ? { tone: 'atencao' as const } : {})}
            >
              {b.outOfStock} posições sem saldo
            </Text>
          </div>
        ))}
      </dl>
      <Link to="/estoque/inteligencia" className="text-primary mt-3 inline-block underline">
        Ver curva ABC, giro e sugestões de compra
      </Link>
    </section>
  );
}

/** Corpo da tela quando os dados chegaram prontos (`ready: true`) — isolado
 *  do resto de `DashboardScreen` só para manter cada função sob o limite de
 *  linhas/complexidade; nenhuma das seções muda de comportamento. */
export function ResultadosDaConsulta({
  data,
  profile,
  from,
  to,
  branchId,
  cards,
}: {
  readonly data: Dashboard;
  readonly profile: string;
  readonly from: string;
  readonly to: string;
  readonly branchId: string;
  readonly cards: ReadonlyArray<readonly [string, string]>;
}) {
  return (
    <>
      <Text variant="legenda" tone="sutil" className="block">
        Atualizado em {new Date(data.calculatedAt).toLocaleString('pt-BR')}. Atualização automática
        a cada 5 minutos.
      </Text>

      {(cards.length > 0 || (profile === 'seller' && data.monthlyGoalCentavos !== null)) && (
        <ResultadosDoPeriodo
          cards={cards}
          from={from}
          to={to}
          branchId={branchId}
          profile={profile}
          monthlyGoalCentavos={data.monthlyGoalCentavos}
        />
      )}

      {profile === 'admin' && data.branches.length > 1 && (
        <section aria-label="Ranking de filiais por faturamento">
          <Text variant="tituloSecao">Filiais por faturamento</Text>
          <Text variant="corpoSecundario" className="mt-1 block">
            Mesmo dado da coluna Faturamento do comparativo abaixo, em ordem.
          </Text>
          <div className="mt-3">
            <RankingDeFiliais branches={data.branches} />
          </div>
        </section>
      )}

      {data.branches.length > 0 && <ComparativoDeFiliais branches={data.branches} />}

      {data.stock.length > 0 && <EstoqueAtual stock={data.stock} />}

      {!cards.length && !data.stock.length && (
        <Text variant="corpoSecundario" className="block">
          Nenhum indicador disponível para o filtro selecionado.
        </Text>
      )}
    </>
  );
}
