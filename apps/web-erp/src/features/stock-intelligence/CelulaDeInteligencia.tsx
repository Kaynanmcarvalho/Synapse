import { Status, Text, type TomDeStatus } from '@synapse/sdl';
import { Check } from 'lucide-react';
import { useState, type ReactNode } from 'react';
import {
  adjustSuggestion,
  type AbcClass,
  type StockIntelligenceMetric,
} from './stock-intelligence.api';
import type { IdDeColuna } from './colunas';

const TOM_DO_ABC: Record<AbcClass, TomDeStatus> = { A: 'ok', B: 'atencao', C: 'neutro' };

function CelulaDeSugestao({
  metric,
  branchId,
  onAdjusted,
}: {
  readonly metric: StockIntelligenceMetric;
  readonly branchId: string;
  readonly onAdjusted: (updated: StockIntelligenceMetric) => void;
}) {
  const [valor, setValor] = useState(
    String(metric.approvedPurchaseQty ?? metric.suggestedPurchaseQty),
  );
  const [salvando, setSalvando] = useState(false);
  const [salvo, setSalvo] = useState(false);

  const salvar = async () => {
    const quantidade = Number(valor);
    if (!Number.isFinite(quantidade) || quantidade < 0) return;
    setSalvando(true);
    try {
      const atualizado = await adjustSuggestion(
        metric.productId,
        branchId.trim(),
        Math.round(quantidade),
      );
      onAdjusted(atualizado);
      setSalvo(true);
      window.setTimeout(() => setSalvo(false), 1800);
    } finally {
      setSalvando(false);
    }
  };

  const ajustado = metric.approvedPurchaseQty !== null;

  return (
    <div className="flex items-center justify-end gap-1.5">
      <Text variant="legenda" tone="apoio" className="font-data">
        sugerido <strong className="text-ink-medio">{metric.suggestedPurchaseQty}</strong>
      </Text>
      <input
        type="number"
        min={0}
        value={valor}
        onChange={(evento) => setValor(evento.target.value)}
        className={`font-data h-controle-compacta rounded-controle text-body-sm focus:border-primary focus:ring-primary/30 w-20 border px-2 text-right font-semibold outline-none focus:ring-2 ${
          ajustado ? 'border-primary/40 bg-primary/5 text-primary' : 'border-line-fina text-ink'
        }`}
      />
      <button
        type="button"
        onClick={salvar}
        disabled={salvando}
        className="text-ink-sutil hover:bg-status-ok-fundo hover:text-status-ok rounded-controle flex h-8 w-8 items-center justify-center transition disabled:opacity-40"
        aria-label="Aprovar quantidade"
      >
        {salvo ? <Check size={14} className="text-status-ok" /> : '✓'}
      </button>
    </div>
  );
}

type Desenho = (
  metric: StockIntelligenceMetric,
  contexto: {
    readonly branchId: string;
    readonly onAdjusted: (updated: StockIntelligenceMetric) => void;
  },
) => ReactNode;

const DESENHOS: Record<IdDeColuna, Desenho> = {
  product: (metric) => (
    <>
      <Text variant="corpo" className="block font-semibold">
        {metric.productName}
      </Text>
      <span className="mt-0.5 flex items-center gap-2">
        <Text variant="legenda" tone="apoio" className="font-data">
          SKU {metric.sku}
        </Text>
        {metric.isDeadStock && (
          <Status tone="perigo" variant="chip">
            parado
          </Status>
        )}
        {metric.isExcess && (
          <Status tone="atencao" variant="chip">
            excesso
          </Status>
        )}
      </span>
    </>
  ),
  abc: (metric) => (
    <Status tone={TOM_DO_ABC[metric.abc.byRevenue]} variant="chip">
      {metric.abc.byRevenue}
    </Status>
  ),
  stock: (metric) => <Text variant="dado">{metric.stockOnHand}</Text>,
  turnover: (metric) => <Text variant="dado">{metric.turnoverRate.toFixed(1)}×</Text>,
  coverage: (metric) => (
    <Text variant="dado">
      {metric.coverageDays === null ? '—' : `${Math.round(metric.coverageDays)}d`}
    </Text>
  ),
  stockouts: (metric) =>
    metric.stockoutCount > 0 ? (
      <Text variant="dado" tone="perigo" className="font-semibold">
        {metric.stockoutCount}
      </Text>
    ) : (
      <Text variant="dado" tone="sutil">
        —
      </Text>
    ),
  suggestion: (metric, contexto) => (
    <CelulaDeSugestao
      metric={metric}
      branchId={contexto.branchId}
      onAdjusted={contexto.onAdjusted}
    />
  ),
};

export function CelulaDeInteligencia({
  coluna,
  metric,
  branchId,
  onAdjusted,
}: {
  readonly coluna: IdDeColuna;
  readonly metric: StockIntelligenceMetric;
  readonly branchId: string;
  readonly onAdjusted: (updated: StockIntelligenceMetric) => void;
}) {
  return <>{DESENHOS[coluna](metric, { branchId, onAdjusted })}</>;
}
