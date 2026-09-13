import type { ComportamentoFinanceiro, JanelaDeTempo, ParametrosDaAnalise } from '@synapse/types';
import { useState } from 'react';
import { formatarData, formatarMoeda, formatarPercentual } from '../analise';
import { Situacao } from '../ui/Etiquetas';

/** Comportamento financeiro por janela de tempo. Sem amostra minima, a tela
 *  mostra os numeros crus e diz que o historico e insuficiente — cliente novo
 *  sem atraso nao e "excelente pagador", e so cliente novo. */

const JANELAS: ReadonlyArray<{ readonly id: JanelaDeTempo; readonly rotulo: string }> = [
  { id: '90D', rotulo: '90 dias' },
  { id: '6M', rotulo: '6 meses' },
  { id: '12M', rotulo: '12 meses' },
];

const dias = (valor: number | null) =>
  valor === null ? '—' : `${valor.toLocaleString('pt-BR')} ${valor === 1 ? 'dia' : 'dias'}`;

function Metrica({
  rotulo,
  valor,
  apoio,
}: {
  readonly rotulo: string;
  readonly valor: string;
  readonly apoio?: string | undefined;
}) {
  return (
    <div className="min-w-0">
      <dt className="text-caption text-stone">{rotulo}</dt>
      <dd className="text-body-sm text-ink font-semibold tabular-nums">{valor}</dd>
      {apoio && <dd className="text-caption text-stone">{apoio}</dd>}
    </div>
  );
}

function Seletor({
  janela,
  aoTrocar,
}: {
  readonly janela: JanelaDeTempo;
  readonly aoTrocar: (janela: JanelaDeTempo) => void;
}) {
  return (
    <div
      role="radiogroup"
      aria-label="Período"
      className="bg-surface-soft inline-flex rounded-full p-0.5"
    >
      {JANELAS.map((opcao) => (
        <button
          key={opcao.id}
          type="button"
          role="radio"
          aria-checked={janela === opcao.id}
          onClick={() => aoTrocar(opcao.id)}
          className={`text-caption rounded-full px-2.5 py-1 font-semibold transition ${
            janela === opcao.id
              ? 'bg-canvas-light text-ink shadow-cartao'
              : 'text-charcoal hover:text-ink'
          }`}
        >
          {opcao.rotulo}
        </button>
      ))}
    </div>
  );
}

function DaJanela({
  comportamento,
  janela,
}: {
  readonly comportamento: ComportamentoFinanceiro;
  readonly janela: JanelaDeTempo;
}) {
  const { pontualidade, compras } = comportamento.janelas[janela];
  const suficiente = comportamento.historicoSuficiente;
  return (
    <dl className="grid grid-cols-2 gap-x-4 gap-y-2.5">
      <Metrica
        rotulo="Pagos no prazo"
        valor={
          suficiente && pontualidade.percentualNoPrazo !== null
            ? formatarPercentual(pontualidade.percentualNoPrazo)
            : '—'
        }
        apoio={`${pontualidade.titulosLiquidados} título(s) no período`}
      />
      <Metrica
        rotulo="Antes · no dia · após"
        valor={`${pontualidade.antecipados} · ${pontualidade.noVencimento} · ${pontualidade.emAtraso}`}
      />
      <Metrica rotulo="Atraso médio" valor={dias(pontualidade.atrasoMedioDias)} />
      <Metrica rotulo="Maior atraso" valor={dias(pontualidade.maiorAtrasoDias)} />
      <Metrica rotulo="Pago no período" valor={formatarMoeda(pontualidade.pagoCentavos)} />
      <Metrica
        rotulo="Compras"
        valor={`${compras.pedidos} · ${formatarMoeda(compras.valorCentavos)}`}
      />
      <Metrica
        rotulo="Ticket médio"
        valor={
          compras.ticketMedioCentavos === null ? '—' : formatarMoeda(compras.ticketMedioCentavos)
        }
      />
      <Metrica
        rotulo="Prazo médio"
        valor={dias(compras.prazoMedioDias)}
        apoio={`${compras.pedidosAPrazo} a prazo`}
      />
    </dl>
  );
}

/** O que vale para toda a historia do cliente, fora das janelas. */
function DaHistoria({ comportamento }: { readonly comportamento: ComportamentoFinanceiro }) {
  const atraso = comportamento.ultimoAtraso;
  return (
    <dl className="border-hairline-light grid grid-cols-2 gap-x-4 gap-y-2.5 border-t pt-2.5">
      <Metrica
        rotulo="Último atraso"
        valor={atraso ? dias(atraso.dias) : 'Nenhum'}
        apoio={
          atraso
            ? `Título ${atraso.identificacao}, pago em ${formatarData(atraso.pagoEm)}`
            : undefined
        }
      />
      <Metrica
        rotulo="Última compra"
        valor={
          comportamento.ultimaCompraEm ? formatarData(comportamento.ultimaCompraEm) : 'Nenhuma'
        }
      />
      <Metrica
        rotulo="Maior exposição"
        valor={
          comportamento.maiorExposicaoHistoricaCentavos === null
            ? '—'
            : formatarMoeda(comportamento.maiorExposicaoHistoricaCentavos)
        }
        apoio="saldo em aberto já registrado"
      />
      <Metrica
        rotulo="Títulos considerados"
        valor={`${comportamento.titulosConsiderados}`}
        apoio="liquidados, toda a história"
      />
    </dl>
  );
}

export function Comportamento({
  comportamento,
  parametros,
}: {
  readonly comportamento: ComportamentoFinanceiro;
  readonly parametros: ParametrosDaAnalise;
}) {
  const [janela, setJanela] = useState<JanelaDeTempo>('12M');
  return (
    <div className="grid gap-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <Seletor janela={janela} aoTrocar={setJanela} />
        {!comportamento.historicoSuficiente && (
          <Situacao
            tom="atencao"
            texto={`Histórico insuficiente: ${comportamento.titulosConsiderados} de ${parametros.minimoDeTitulosLiquidados} títulos`}
          />
        )}
      </div>
      <DaJanela comportamento={comportamento} janela={janela} />
      <DaHistoria comportamento={comportamento} />
    </div>
  );
}
