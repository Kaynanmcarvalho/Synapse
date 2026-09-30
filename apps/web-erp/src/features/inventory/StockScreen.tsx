/* eslint-disable max-lines, max-lines-per-function */
import {
  AlertTriangle,
  ArrowDownCircle,
  ArrowUpCircle,
  Plus,
  Search,
  Settings2,
} from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { Drawer, Modal } from '@synapse/ui';
import {
  Button,
  classesDaLinha,
  cn,
  DataGridCabecalho,
  DataGridCelula,
  Divider,
  Field,
  Input,
  NumberInput,
  Spinner,
  Status,
  SynapseSignal,
  Text,
  type TomDeStatus,
} from '@synapse/sdl';
import {
  AreaDeTexto,
  LinhaDeCampos,
  Secao,
  ValoresDeLeitura,
} from '../../components/formulario/Formulario';
import { LARGURA_DE_CAMPO } from '../../components/formulario/larguras';
import { Indicador } from '../../components/indicadores/Indicador';
import { devSignIn, isSignedIn } from '../../lib/dev-auth';
import {
  createLot,
  getLotBalance,
  listExpiryAlerts,
  moveStock,
  type ExpiringLot,
  type ExpiryAlertLevel,
  type LotBalance,
  type QuickMovementKind,
} from './stock.api';

const LEVEL_LABEL: Record<ExpiryAlertLevel, string> = {
  D90: '90 dias',
  D60: '60 dias',
  D30: '30 dias',
  D15: '15 dias',
  EXPIRED: 'Vencido',
};

/** Os 5 níveis do alerta de vencimento não têm 5 tons próprios no Status do
 *  SDL — só 8 tons no total, pensados para estado de negócio, não para uma
 *  escala de urgência específica desta tela. D30 e D15 dividem `perigo`: a
 *  diferença real entre eles já está no texto ("30 dias" vs "15 dias"), não
 *  precisa de uma quinta cor para existir. `vencido` é reservado para
 *  EXPIRED porque é exatamente o que o tom já significa em outras telas
 *  (título vencido, na fila de crédito). */
const TOM_DO_NIVEL: Record<ExpiryAlertLevel, TomDeStatus> = {
  D90: 'info',
  D60: 'atencao',
  D30: 'perigo',
  D15: 'perigo',
  EXPIRED: 'vencido',
};

function LoginGate({ onSignedIn }: { readonly onSignedIn: () => void }) {
  const [email, setEmail] = useState('teste.rbac@synapse.dev');
  const [password, setPassword] = useState('Senha123!');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const submit = async () => {
    setLoading(true);
    setError(null);
    try {
      await devSignIn(email, password);
      onSignedIn();
    } catch (cause) {
      setError((cause as Error).message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="bg-canvas-light flex min-h-screen items-center justify-center p-8">
      <div className="border-line-fina w-full max-w-sm rounded-2xl border p-5">
        <Text variant="tituloCartao" className="mb-4 block">
          Entrar (emulador local)
        </Text>
        <div className="flex flex-col gap-3">
          <Input value={email} onChange={(e) => setEmail(e.target.value)} placeholder="e-mail" />
          <Input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="senha"
          />
          {error && (
            <Text variant="corpo" tone="perigo" role="alert">
              {error}
            </Text>
          )}
          <Button variant="primary" onClick={submit} loading={loading}>
            Entrar
          </Button>
        </div>
      </div>
    </main>
  );
}

function NewLotModal({
  onClose,
  onCreated,
}: {
  readonly onClose: () => void;
  readonly onCreated: () => void;
}) {
  const [form, setForm] = useState({
    branchId: 'matriz',
    warehouseId: 'deposito-1',
    productId: '',
    manufacturedAt: '',
    expiresAt: '',
    quantity: '',
  });
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const submit = async () => {
    setError(null);
    setSaving(true);
    try {
      await createLot({ ...form, quantity: Number(form.quantity) });
      onCreated();
    } catch (cause) {
      setError((cause as Error).message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal
      onClose={onClose}
      eyebrow="Entrada de estoque"
      title="Novo lote"
      description="Registra a entrada de um lote rastreável, com fabricação e validade para o FEFO."
      footer={
        <>
          <Button variant="quiet" onClick={onClose}>
            Cancelar
          </Button>
          <Button
            variant="primary"
            onClick={submit}
            loading={saving}
            disabled={!form.productId || !form.quantity}
          >
            Cadastrar lote
          </Button>
        </>
      }
    >
      <div className="flex flex-col gap-3">
        <LinhaDeCampos>
          <Field label="Filial" className={LARGURA_DE_CAMPO.curto}>
            <Input
              value={form.branchId}
              onChange={(e) => setForm({ ...form, branchId: e.target.value })}
            />
          </Field>
          <Field label="Depósito" className={LARGURA_DE_CAMPO.curto}>
            <Input
              value={form.warehouseId}
              onChange={(e) => setForm({ ...form, warehouseId: e.target.value })}
            />
          </Field>
          <Field label="Id do produto" className={LARGURA_DE_CAMPO.resto}>
            <Input
              value={form.productId}
              onChange={(e) => setForm({ ...form, productId: e.target.value })}
            />
          </Field>
        </LinhaDeCampos>
        <LinhaDeCampos>
          <Field label="Fabricação" className={LARGURA_DE_CAMPO.curto}>
            <Input
              type="date"
              value={form.manufacturedAt}
              onChange={(e) => setForm({ ...form, manufacturedAt: e.target.value })}
            />
          </Field>
          <Field label="Validade" className={LARGURA_DE_CAMPO.curto}>
            <Input
              type="date"
              value={form.expiresAt}
              onChange={(e) => setForm({ ...form, expiresAt: e.target.value })}
            />
          </Field>
          <Field label="Quantidade" className={LARGURA_DE_CAMPO.codigo}>
            <NumberInput
              value={form.quantity}
              onChange={(e) => setForm({ ...form, quantity: e.target.value })}
            />
          </Field>
        </LinhaDeCampos>
        {error && (
          <Text variant="corpo" tone="perigo" role="alert">
            {error}
          </Text>
        )}
      </div>
    </Modal>
  );
}

const KIND_OPTIONS: ReadonlyArray<{
  value: QuickMovementKind;
  label: string;
  description: string;
  icon: typeof ArrowUpCircle;
  tint: string;
}> = [
  {
    value: 'INBOUND',
    label: 'Entrada',
    description: 'Recebimento fora de compra ou transferência.',
    icon: ArrowUpCircle,
    tint: 'text-emerald-600',
  },
  {
    value: 'OUTBOUND',
    label: 'Saída',
    description: 'Baixa manual, perda, quebra ou descarte.',
    icon: ArrowDownCircle,
    tint: 'text-rose-600',
  },
  {
    value: 'ADJUSTMENT',
    label: 'Ajuste',
    description: 'Correção pontual de saldo após conferência.',
    icon: Settings2,
    tint: 'text-blue-600',
  },
];

function QuickAdjustDrawer({
  onClose,
  onAdjusted,
}: {
  readonly onClose: () => void;
  readonly onAdjusted: () => void;
}) {
  const [kind, setKind] = useState<QuickMovementKind>('ADJUSTMENT');
  const [form, setForm] = useState({
    branchId: 'matriz',
    warehouseId: 'deposito-1',
    productId: '',
    quantity: '',
    reason: '',
  });
  const [allowNegative, setAllowNegative] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const submit = async () => {
    setError(null);
    setSaving(true);
    try {
      await moveStock(kind, {
        branchId: form.branchId,
        warehouseId: form.warehouseId,
        productId: form.productId,
        quantity: Number(form.quantity),
        reason: form.reason,
        allowNegative,
      });
      onAdjusted();
    } catch (cause) {
      setError((cause as Error).message);
    } finally {
      setSaving(false);
    }
  };

  const invalid = !form.productId || !form.quantity || form.reason.trim().length < 3;

  return (
    <Drawer
      onClose={onClose}
      eyebrow="Movimentação manual"
      title="Ajuste rápido de saldo"
      description="Fora do fluxo de venda ou transferência — cada ajuste fica registrado com motivo e responsável."
      footer={
        <>
          <Button variant="quiet" onClick={onClose}>
            Cancelar
          </Button>
          <Button variant="primary" onClick={submit} loading={saving} disabled={invalid}>
            Confirmar movimento
          </Button>
        </>
      }
    >
      <div className="grid grid-cols-3 gap-2">
        {KIND_OPTIONS.map((option) => {
          const selected = kind === option.value;
          return (
            <button
              key={option.value}
              type="button"
              onClick={() => setKind(option.value)}
              className={cn(
                'rounded-controle border-line-fina duration-rapido flex flex-col items-center gap-2 border p-3 text-center transition-colors',
                selected ? 'border-primary bg-primary/5' : 'hover:border-faint',
              )}
            >
              <option.icon size={20} className={option.tint} />
              <Text variant="rotulo" as="span" className="text-ink font-semibold">
                {option.label}
              </Text>
            </button>
          );
        })}
      </div>
      <Text variant="corpoSecundario" className="mt-2 block">
        {KIND_OPTIONS.find((option) => option.value === kind)?.description}
      </Text>

      <div className="mt-5 flex flex-col gap-3">
        <LinhaDeCampos>
          <Field label="Filial" className={LARGURA_DE_CAMPO.curto}>
            <Input
              value={form.branchId}
              onChange={(e) => setForm({ ...form, branchId: e.target.value })}
            />
          </Field>
          <Field label="Depósito" className={LARGURA_DE_CAMPO.curto}>
            <Input
              value={form.warehouseId}
              onChange={(e) => setForm({ ...form, warehouseId: e.target.value })}
            />
          </Field>
          <Field label="Id do produto" className={LARGURA_DE_CAMPO.resto}>
            <Input
              value={form.productId}
              onChange={(e) => setForm({ ...form, productId: e.target.value })}
            />
          </Field>
          <Field label="Quantidade" className={LARGURA_DE_CAMPO.codigo}>
            <NumberInput
              value={form.quantity}
              onChange={(e) => setForm({ ...form, quantity: e.target.value })}
            />
          </Field>
        </LinhaDeCampos>

        <label className="flex items-center gap-2">
          <input
            type="checkbox"
            checked={allowNegative}
            onChange={(e) => setAllowNegative(e.target.checked)}
            className="border-line-fina text-primary h-4 w-4 rounded"
          />
          <Text variant="corpo" as="span">
            Permitir saldo negativo
          </Text>
        </label>

        <Field label="Motivo">
          <AreaDeTexto
            rows={2}
            value={form.reason}
            onChange={(e) => setForm({ ...form, reason: e.target.value })}
            placeholder="Ex.: avaria no transporte, contagem cega, doação"
          />
        </Field>

        {error && (
          <Text variant="corpo" tone="perigo" role="alert">
            {error}
          </Text>
        )}
      </div>
    </Drawer>
  );
}

/** Gaveta de consulta — Fase 6.4, laboratório definitivo de Drawer. Era um
 *  card escuro + grade de saldo + `dl` cru, cada um com sua própria paleta
 *  Tailwind solta; a tabela ao lado (`LinhaDeVencimento`, acima) já usava
 *  `Status`/`Text`/`font-data` do SDL havia fases. Agora a gaveta usa
 *  exatamente o mesmo vocabulário — `TOM_DO_NIVEL`/`LEVEL_LABEL` são os
 *  MESMOS que a linha da tabela usa, não uma segunda paleta — e `Secao`/
 *  `ValoresDeLeitura` da Form Grammar (Fase 6) para as seções e os pares
 *  rótulo/valor. Puramente consultivo: nenhum campo editável, nenhuma ação
 *  nova — a versão antiga também não tinha nenhuma. A mecânica do Drawer
 *  (`@synapse/ui`) não muda: pilha de sobreposições, foco preso e devolvido,
 *  Esc só no topo — tudo isso já vinha de `useOverlay` (Fase 6.3). */
export function LotDetailDrawer({
  alert,
  onClose,
}: {
  readonly alert: ExpiringLot;
  readonly onClose: () => void;
}) {
  const { lot, daysUntilExpiry, alertLevel } = alert;
  const [balance, setBalance] = useState<LotBalance | null>(null);
  const [loading, setLoading] = useState(true);
  const [erro, setErro] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    setLoading(true);
    setErro(null);
    getLotBalance(lot.branchId, lot.warehouseId, lot.productId)
      .then((result) => {
        if (active) setBalance(result);
      })
      .catch((cause: unknown) => {
        if (active)
          setErro(cause instanceof Error ? cause.message : 'Não foi possível ler o saldo');
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [lot.branchId, lot.warehouseId, lot.productId]);

  return (
    <Drawer
      onClose={onClose}
      eyebrow={`${lot.branchId} / ${lot.warehouseId}`}
      title={lot.productId}
      description={`Lote ${lot.id.slice(0, 8)}`}
    >
      <div className="flex flex-col gap-5">
        <Secao
          titulo="Situação"
          acao={
            <Status tone={TOM_DO_NIVEL[alertLevel]} variant="chip">
              {LEVEL_LABEL[alertLevel]}
            </Status>
          }
        >
          <Text
            variant="dado"
            {...(alertLevel === 'EXPIRED' ? { tone: 'perigo' as const } : {})}
            className="text-heading-sm block font-semibold"
          >
            {alertLevel === 'EXPIRED'
              ? `Vencido há ${Math.abs(daysUntilExpiry)} dias`
              : `Em ${daysUntilExpiry} dias`}
          </Text>
        </Secao>

        <Secao titulo="Saldo" descricao="Físico, reservado e disponível para venda">
          {loading ? (
            <p role="status" className="text-body-sm text-stone flex items-center gap-2 py-1">
              <Spinner /> Carregando saldo…
            </p>
          ) : erro ? (
            <Text variant="corpo" tone="perigo" role="alert">
              {erro}
            </Text>
          ) : balance ? (
            <ValoresDeLeitura
              itens={[
                { rotulo: 'Físico', valor: balance.physical, dado: true },
                { rotulo: 'Reservado', valor: balance.reserved, dado: true },
                { rotulo: 'Disponível', valor: balance.available, dado: true },
              ]}
            />
          ) : null}
        </Secao>

        <Secao titulo="Detalhes do lote">
          <ValoresDeLeitura
            itens={[
              { rotulo: 'Fabricação', valor: lot.manufacturedAt },
              { rotulo: 'Validade', valor: lot.expiresAt },
              { rotulo: 'Quantidade inicial', valor: lot.initialQuantity, dado: true },
            ]}
          />
        </Secao>
      </div>
    </Drawer>
  );
}

function AlertSummary({
  alerts,
  className,
}: {
  readonly alerts: readonly ExpiringLot[];
  readonly className?: string;
}) {
  const expired = alerts.filter((a) => a.alertLevel === 'EXPIRED').length;
  const critical = alerts.filter((a) => a.alertLevel === 'D15').length;
  const total = alerts.length;

  return (
    <dl className={cn('divide-hairline-light flex flex-wrap divide-x', className)}>
      <Indicador rotulo="Lotes monitorados" valor={total} apoio="Janela de 90 dias" />
      <Indicador
        rotulo="Vencidos"
        valor={expired}
        apoio="Requer baixa ou descarte"
        atencao={expired > 0}
      />
      <Indicador
        rotulo="Críticos (≤15 dias)"
        valor={critical}
        apoio="Priorizar saída FEFO"
        atencao={critical > 0}
      />
    </dl>
  );
}

/** A linha da tabela de vencimento — piloto de seleção fora da fila de
 *  crédito (Fase 5.2). Auditoria encontrou algo importante: esta tela nunca
 *  teve um estado "selecionada" persistente — `onSelect` só abre a gaveta de
 *  detalhe, exatamente como o clique/Enter de Clientes. Não existe row style
 *  para "linha atual" comparável ao da fila, então não há o que comparar
 *  além do próprio row-open — mantido igual, sem inventar destaque novo. */
function LinhaDeVencimento({
  alert,
  onSelect,
}: {
  readonly alert: ExpiringLot;
  readonly onSelect: (alert: ExpiringLot) => void;
}) {
  const { lot, daysUntilExpiry, alertLevel } = alert;
  return (
    <tr
      tabIndex={0}
      onClick={() => onSelect(alert)}
      onKeyDown={(event) => {
        if (event.key === 'Enter') onSelect(alert);
      }}
      className={classesDaLinha({ hairlineNaLinha: true, focoComAnel: false })}
    >
      <DataGridCelula papel="primary" truncar={false} className="relative">
        <SynapseSignal gatilho="foco-do-grupo" />
        <Text variant="corpo" className="block font-semibold">
          {lot.productId}
        </Text>
        <Text variant="legenda" tone="apoio" className="font-data block">
          Lote {lot.id.slice(0, 8)}
        </Text>
      </DataGridCelula>
      <DataGridCelula papel="secondary" truncar={false}>
        <Text variant="corpoSecundario">
          {lot.branchId} / {lot.warehouseId}
        </Text>
      </DataGridCelula>
      <DataGridCelula papel="data" alinhamento="direita" truncar={false}>
        <Text variant="dado" className="font-semibold">
          {lot.physical - lot.reserved}
        </Text>
      </DataGridCelula>
      <DataGridCelula papel="data" alinhamento="direita" truncar={false}>
        {alertLevel === 'EXPIRED' ? (
          <Text variant="dado" tone="perigo" className="inline-flex items-center gap-1">
            <AlertTriangle size={14} aria-hidden="true" /> há {Math.abs(daysUntilExpiry)} dias
          </Text>
        ) : (
          <Text variant="dado" tone="sutil">
            {daysUntilExpiry} dias
          </Text>
        )}
      </DataGridCelula>
      <DataGridCelula papel="status" alinhamento="centro" truncar={false}>
        <Status tone={TOM_DO_NIVEL[alertLevel]} variant="chip">
          {LEVEL_LABEL[alertLevel]}
        </Status>
      </DataGridCelula>
    </tr>
  );
}

export function ExpiryTable({
  alerts,
  onSelect,
}: {
  readonly alerts: readonly ExpiringLot[];
  readonly onSelect: (alert: ExpiringLot) => void;
}) {
  if (alerts.length === 0) {
    return (
      <Text variant="corpoSecundario" className="block px-6 py-10 text-center">
        Nenhum lote dentro da janela de alerta (90 dias).
      </Text>
    );
  }
  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[680px] border-collapse text-left">
        <thead>
          <tr className="border-hairline-light bg-surface-soft border-b">
            <DataGridCabecalho id="produto" rotulo="Produto" />
            <DataGridCabecalho id="deposito" rotulo="Depósito" />
            <DataGridCabecalho id="saldo" rotulo="Saldo" alinhamento="direita" />
            <DataGridCabecalho id="vence" rotulo="Vence em" alinhamento="direita" />
            <DataGridCabecalho id="alerta" rotulo="Alerta" alinhamento="centro" />
          </tr>
        </thead>
        <tbody>
          {alerts.map((alert) => (
            <LinhaDeVencimento key={alert.lot.id} alert={alert} onSelect={onSelect} />
          ))}
        </tbody>
      </table>
    </div>
  );
}

type StockModal = 'none' | 'new-lot' | 'adjust';

/** Nível de alerta ou "todos" — o filtro de situação da toolbar. Reaproveita
 *  exatamente os mesmos `alertLevel` que a tabela já calcula; nenhuma
 *  situação nova é inventada aqui. */
type FiltroDeNivel = 'todos' | ExpiryAlertLevel;

const NIVEIS: readonly FiltroDeNivel[] = ['todos', 'D90', 'D60', 'D30', 'D15', 'EXPIRED'];

const combina = (alert: ExpiringLot, busca: string): boolean => {
  if (!busca) return true;
  const alvo =
    `${alert.lot.productId} ${alert.lot.branchId} ${alert.lot.warehouseId}`.toLowerCase();
  return alvo.includes(busca);
};

/** Busca por texto + pílulas de nível — mesma gramática de `FiltrosDaFila`
 *  (fila de crédito): ícone de lupa dentro do campo, pílulas com contagem
 *  real, "Limpar" quando há algo a limpar. Tudo client-side sobre o que já
 *  foi buscado — `listExpiryAlerts` não tem parâmetro de filtro na API, e
 *  esta fase não mexe em integração com API. */
function FerramentasDeLocalizacao({
  busca,
  aoBuscar,
  nivel,
  aoTrocarNivel,
  contagem,
}: {
  readonly busca: string;
  readonly aoBuscar: (valor: string) => void;
  readonly nivel: FiltroDeNivel;
  readonly aoTrocarNivel: (nivel: FiltroDeNivel) => void;
  readonly contagem: (nivel: FiltroDeNivel) => number;
}) {
  const podeLimpar = busca.trim() !== '' || nivel !== 'todos';
  return (
    <div className="flex flex-wrap items-center gap-3">
      <div className="relative min-w-[220px] flex-1 sm:max-w-xs">
        <Search
          size={15}
          aria-hidden="true"
          className="text-ink-sutil pointer-events-none absolute left-3 top-1/2 -translate-y-1/2"
        />
        <Input
          value={busca}
          onChange={(e) => aoBuscar(e.target.value)}
          placeholder="Produto, filial ou depósito"
          aria-label="Localizar lote"
          className="w-full pl-9"
        />
      </div>
      <div className="flex flex-wrap items-center gap-1.5">
        {NIVEIS.map((opcao) => {
          const ativo = nivel === opcao;
          return (
            <button
              key={opcao}
              type="button"
              onClick={() => aoTrocarNivel(opcao)}
              aria-pressed={ativo}
              className={cn(
                'text-caption rounded-controle duration-rapido inline-flex items-center gap-1.5 border px-3 py-1 transition-colors',
                ativo
                  ? 'border-primary bg-primary text-primary-on'
                  : 'border-hairline-light text-charcoal hover:bg-surface-hover',
              )}
            >
              {opcao === 'todos' ? 'Todos' : LEVEL_LABEL[opcao]}
              <span className={ativo ? 'text-primary-on/70' : 'text-stone'}>{contagem(opcao)}</span>
            </button>
          );
        })}
        {podeLimpar && (
          <Button
            variant="quiet"
            density="compacta"
            onClick={() => {
              aoBuscar('');
              aoTrocarNivel('todos');
            }}
          >
            Limpar
          </Button>
        )}
      </div>
    </div>
  );
}

export function StockScreen() {
  const [signedIn, setSignedIn] = useState(false);
  const [alerts, setAlerts] = useState<ExpiringLot[]>([]);
  const [loading, setLoading] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [modal, setModal] = useState<StockModal>('none');
  const [selected, setSelected] = useState<ExpiringLot | null>(null);
  const [busca, setBusca] = useState('');
  const [nivel, setNivel] = useState<FiltroDeNivel>('todos');

  const refresh = async () => {
    setLoading(true);
    setErro(null);
    try {
      setAlerts(await listExpiryAlerts());
    } catch (cause) {
      setErro(cause instanceof Error ? cause.message : 'Não foi possível ler os alertas');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => setSignedIn(isSignedIn()), []);
  useEffect(() => {
    if (signedIn) void refresh();
  }, [signedIn]);

  const buscaNormalizada = busca.trim().toLowerCase();
  const porBusca = useMemo(
    () => alerts.filter((alert) => combina(alert, buscaNormalizada)),
    [alerts, buscaNormalizada],
  );
  const visiveis = useMemo(
    () => (nivel === 'todos' ? porBusca : porBusca.filter((a) => a.alertLevel === nivel)),
    [porBusca, nivel],
  );
  const contagemPorNivel = (opcao: FiltroDeNivel) =>
    opcao === 'todos' ? porBusca.length : porBusca.filter((a) => a.alertLevel === opcao).length;

  if (!signedIn) return <LoginGate onSignedIn={() => setSignedIn(true)} />;

  return (
    <main className="bg-canvas-light relative min-h-screen text-slate-950">
      <div className="relative mx-auto flex max-w-[1800px] flex-col gap-5 px-5 py-6 sm:px-8 lg:px-10">
        <header className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <div className="text-caption text-primary flex items-center gap-2 font-bold uppercase tracking-[0.14em]">
              <span className="bg-primary h-1.5 w-1.5 rounded-full" /> Controle de estoque
            </div>
            <Text variant="tituloTela" className="mt-1.5 block">
              Estoque
            </Text>
            <Text variant="corpoSecundario" className="mt-1 block max-w-2xl">
              Lotes, validade e FEFO (§8) — a base do PDV e da separação.
            </Text>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="secondary" onClick={() => setModal('adjust')}>
              <Settings2 size={16} aria-hidden="true" /> Ajuste rápido
            </Button>
            <Button variant="primary" onClick={() => setModal('new-lot')}>
              <Plus size={16} aria-hidden="true" /> Novo lote
            </Button>
          </div>
        </header>

        <AlertSummary alerts={alerts} />
        <Divider />

        <FerramentasDeLocalizacao
          busca={busca}
          aoBuscar={setBusca}
          nivel={nivel}
          aoTrocarNivel={setNivel}
          contagem={contagemPorNivel}
        />

        <section>
          <div className="mb-2 flex items-baseline justify-between gap-3">
            <Text variant="tituloSecao">Produtos próximos do vencimento</Text>
            <Text variant="legenda" tone="sutil">
              Janela de 90 dias, priorizando FEFO
              {visiveis.length !== alerts.length ? ` · ${visiveis.length} de ${alerts.length}` : ''}
            </Text>
          </div>
          {loading ? (
            <div className="flex justify-center py-14">
              <Spinner />
            </div>
          ) : erro ? (
            <Text variant="corpo" tone="perigo" role="alert" className="block py-10 text-center">
              {erro}
            </Text>
          ) : alerts.length > 0 && visiveis.length === 0 ? (
            // Diferente de "nenhum lote no sistema": aqui existem lotes, só
            // nenhum corresponde à busca/pílula atual. A mensagem genérica
            // do ExpiryTable ("Nenhum lote dentro da janela...") confundiria
            // as duas situações — Fase 7.1 (§1-C) encontrou essa lacuna.
            <Text variant="corpoSecundario" className="block px-6 py-10 text-center" role="status">
              Nenhum lote corresponde à busca ou ao filtro atual.
            </Text>
          ) : (
            <ExpiryTable alerts={visiveis} onSelect={setSelected} />
          )}
        </section>
      </div>

      {modal === 'new-lot' && (
        <NewLotModal
          onClose={() => setModal('none')}
          onCreated={() => {
            setModal('none');
            void refresh();
          }}
        />
      )}
      {modal === 'adjust' && (
        <QuickAdjustDrawer
          onClose={() => setModal('none')}
          onAdjusted={() => {
            setModal('none');
            void refresh();
          }}
        />
      )}
      {selected && <LotDetailDrawer alert={selected} onClose={() => setSelected(null)} />}
    </main>
  );
}
