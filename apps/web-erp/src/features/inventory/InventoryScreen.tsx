/* eslint-disable max-lines, max-lines-per-function */
import { useState, type ReactNode } from 'react';
import { Modal, useOverlayClose } from '@synapse/ui';

type InventoryType = 'GENERAL' | 'PARTIAL' | 'CATEGORY' | 'WAREHOUSE' | 'CYCLE';
type MovementPolicy = 'FREEZE' | 'SNAPSHOT';

interface InventoryDraft {
  type: InventoryType;
  branch: string;
  warehouse: string;
  category: string;
  policy: MovementPolicy;
  responsible: string;
  notes: string;
}

interface IconProps {
  readonly children: ReactNode;
  readonly className?: string;
}

const Icon = ({ children, className = 'h-5 w-5' }: IconProps) => (
  <svg
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.8"
    strokeLinecap="round"
    strokeLinejoin="round"
    className={className}
    aria-hidden="true"
  >
    {children}
  </svg>
);

const icons = {
  boxes: (
    <Icon>
      <path d="m21 8-9 5-9-5 9-5 9 5Z" />
      <path d="m3 8 9 5 9-5M3 12l9 5 9-5M3 16l9 5 9-5" />
    </Icon>
  ),
  scan: (
    <Icon>
      <path d="M3 5V3h4M17 3h4v4M21 17v4h-4M7 21H3v-4M7 8v8M10 8v8M14 8v8M17 8v8" />
    </Icon>
  ),
  chart: (
    <Icon>
      <path d="M4 19V9M10 19V5M16 19v-7M22 19H2" />
    </Icon>
  ),
  spark: (
    <Icon>
      <path d="m12 3 1.2 3.8L17 8l-3.8 1.2L12 13l-1.2-3.8L7 8l3.8-1.2L12 3ZM19 14l.7 2.3L22 17l-2.3.7L19 20l-.7-2.3L16 17l2.3-.7L19 14ZM5 13l.9 2.1L8 16l-2.1.9L5 19l-.9-2.1L2 16l2.1-.9L5 13Z" />
    </Icon>
  ),
  chevron: (
    <Icon className="h-4 w-4">
      <path d="m9 18 6-6-6-6" />
    </Icon>
  ),
  close: (
    <Icon>
      <path d="m6 6 12 12M18 6 6 18" />
    </Icon>
  ),
  check: (
    <Icon className="h-4 w-4">
      <path d="m5 12 4 4L19 6" />
    </Icon>
  ),
  shield: (
    <Icon>
      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10Z" />
      <path d="m9 12 2 2 4-4" />
    </Icon>
  ),
  layers: (
    <Icon>
      <path d="m12 2 9 5-9 5-9-5 9-5Z" />
      <path d="m3 12 9 5 9-5M3 17l9 5 9-5" />
    </Icon>
  ),
  rotate: (
    <Icon>
      <path d="M20 7h-5V2M4 17h5v5" />
      <path d="M18.5 17a8 8 0 0 1-13.8-2M5.5 7a8 8 0 0 1 13.8 2" />
    </Icon>
  ),
  warehouse: (
    <Icon>
      <path d="m3 9 9-6 9 6v12H3V9Z" />
      <path d="M7 21v-8h10v8M7 17h10" />
    </Icon>
  ),
  filter: (
    <Icon>
      <path d="M4 5h16M7 12h10M10 19h4" />
    </Icon>
  ),
  arrow: (
    <Icon className="h-4 w-4">
      <path d="M5 12h14M13 6l6 6-6 6" />
    </Icon>
  ),
};

const TYPE_OPTIONS: Array<{
  value: InventoryType;
  label: string;
  description: string;
  icon: ReactNode;
}> = [
  { value: 'GENERAL', label: 'Geral', description: 'Todo o estoque da filial', icon: icons.boxes },
  {
    value: 'PARTIAL',
    label: 'Parcial',
    description: 'Seleção livre de produtos',
    icon: icons.filter,
  },
  {
    value: 'CATEGORY',
    label: 'Por categoria',
    description: 'Uma família de produtos',
    icon: icons.layers,
  },
  {
    value: 'WAREHOUSE',
    label: 'Por depósito',
    description: 'Todo um local de estoque',
    icon: icons.warehouse,
  },
  { value: 'CYCLE', label: 'Rotativo', description: 'Contagem recorrente ABC', icon: icons.rotate },
];

const INITIAL_DRAFT: InventoryDraft = {
  type: 'GENERAL',
  branch: 'Goiânia — Matriz',
  warehouse: 'Depósito Central',
  category: '',
  policy: 'FREEZE',
  responsible: 'Marina Alves',
  notes: '',
};

const money = (value: number) =>
  new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);

function SelectField({
  label,
  value,
  children,
  onChange,
}: {
  readonly label: string;
  readonly value: string;
  readonly children: ReactNode;
  readonly onChange: (value: string) => void;
}) {
  return (
    <label className="group block">
      <span className="mb-2 block text-[11px] font-bold uppercase tracking-[0.16em] text-slate-500 dark:text-slate-400">
        {label}
      </span>
      <span className="relative block">
        <select
          value={value}
          onChange={(event) => onChange(event.target.value)}
          className="h-12 w-full appearance-none rounded-xl border border-slate-200 bg-white px-4 pr-10 text-sm font-semibold text-slate-800 shadow-sm outline-none transition hover:border-slate-300 focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200"
        >
          {children}
        </select>
        <span className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 rotate-90 text-slate-400">
          {icons.chevron}
        </span>
      </span>
    </label>
  );
}

function NewInventoryModal({
  onClose,
  onCreate,
}: {
  readonly onClose: () => void;
  readonly onCreate: (draft: InventoryDraft) => void;
}) {
  const [step, setStep] = useState(1);
  const [draft, setDraft] = useState(INITIAL_DRAFT);

  return (
    <Modal onClose={onClose} bare label="Novo inventário" size="xl" className="sm:max-w-5xl">
      <NewInventoryModalBody
        step={step}
        setStep={setStep}
        draft={draft}
        setDraft={setDraft}
        onCreate={onCreate}
      />
    </Modal>
  );
}

function NewInventoryModalBody({
  step,
  setStep,
  draft,
  setDraft,
  onCreate,
}: {
  readonly step: number;
  readonly setStep: (step: number) => void;
  readonly draft: InventoryDraft;
  readonly setDraft: (draft: InventoryDraft) => void;
  readonly onCreate: (draft: InventoryDraft) => void;
}) {
  const requestClose = useOverlayClose();
  const selectedType = TYPE_OPTIONS.find((option) => option.value === draft.type)!;

  return (
    <div className="flex min-h-0 flex-1 flex-col lg:flex-row">
      <aside className="relative hidden w-[290px] shrink-0 overflow-hidden bg-slate-950 p-8 text-white lg:block">
        <div className="absolute -right-24 -top-20 h-64 w-64 rounded-full bg-blue-600/25 blur-3xl" />
        <div className="absolute -bottom-20 -left-20 h-56 w-56 rounded-full bg-cyan-400/10 blur-3xl" />
        <div className="relative flex h-full flex-col">
          <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-white/10 text-cyan-300 ring-1 ring-white/15">
            {icons.scan}
          </div>
          <p className="mt-7 text-xs font-bold uppercase tracking-[0.22em] text-blue-300">
            Nova contagem
          </p>
          <h2 className="mt-3 text-2xl font-semibold leading-tight">
            Precisão começa com um bom escopo.
          </h2>
          <p className="mt-3 text-sm leading-6 text-slate-400">
            Configure a operação. O saldo do sistema só aparece após a conferência, evitando viés na
            contagem.
          </p>

          <ol className="mt-10 space-y-1">
            {[
              ['Tipo de inventário', 'Defina o universo da contagem'],
              ['Operação', 'Escolha local e segurança'],
              ['Revisão', 'Confira antes de começar'],
            ].map(([label, description], index) => {
              const number = index + 1;
              const active = step === number;
              const done = step > number;
              return (
                <li key={label} className="relative flex gap-4 pb-7 last:pb-0">
                  {index < 2 && (
                    <span className="absolute left-[15px] top-9 h-[calc(100%-32px)] w-px bg-white/10" />
                  )}
                  <span
                    className={`relative flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-xs font-bold transition ${
                      active
                        ? 'bg-blue-500 text-white shadow-lg shadow-blue-500/30'
                        : done
                          ? 'bg-emerald-400 text-slate-950 dark:text-slate-100'
                          : 'bg-white/5 text-slate-500 ring-1 ring-white/10 dark:text-slate-400'
                    }`}
                  >
                    {done ? icons.check : number}
                  </span>
                  <span>
                    <span
                      className={`block text-sm font-semibold ${active ? 'text-white' : 'text-slate-400'}`}
                    >
                      {label}
                    </span>
                    <span className="mt-0.5 block text-xs leading-5 text-slate-500 dark:text-slate-400">
                      {description}
                    </span>
                  </span>
                </li>
              );
            })}
          </ol>

          <div className="mt-auto rounded-2xl border border-white/10 bg-white/[0.06] p-4">
            <div className="flex items-center gap-2 text-xs font-semibold text-emerald-300">
              {icons.shield} Rastro de auditoria ativo
            </div>
            <p className="mt-2 text-xs leading-5 text-slate-400">
              Responsável, horário e cada ajuste ficam registrados permanentemente.
            </p>
          </div>
        </div>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex items-start justify-between border-b border-slate-100 px-6 py-5 sm:px-8">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.18em] text-blue-600">
              Etapa {step} de 3
            </p>
            <h2 className="mt-1 text-xl font-bold tracking-tight text-slate-950 sm:text-2xl dark:text-slate-100">
              {step === 1 && 'Como você quer contar?'}
              {step === 2 && 'Configure a operação'}
              {step === 3 && 'Tudo pronto para começar'}
            </h2>
          </div>
          <button
            type="button"
            onClick={requestClose}
            aria-label="Fechar modal"
            className="flex h-10 w-10 items-center justify-center rounded-full text-slate-400 transition hover:bg-slate-100 hover:text-slate-800 focus:outline-none focus:ring-4 focus:ring-blue-500/15"
          >
            {icons.close}
          </button>
        </header>

        <div className="min-h-0 flex-1 overflow-y-auto px-6 py-6 sm:px-8 sm:py-7">
          {step === 1 && (
            <div>
              <p className="mb-5 max-w-xl text-sm leading-6 text-slate-500 dark:text-slate-400">
                Escolha o formato que melhor representa a conferência de hoje. Você poderá refinar o
                escopo na próxima etapa.
              </p>
              <div className="grid gap-3 sm:grid-cols-2">
                {TYPE_OPTIONS.map((option, index) => {
                  const selected = draft.type === option.value;
                  return (
                    <button
                      key={option.value}
                      type="button"
                      onClick={() => setDraft({ ...draft, type: option.value })}
                      className={`group relative flex min-h-[102px] items-center gap-4 overflow-hidden rounded-2xl border p-4 text-left transition-all duration-200 focus:outline-none focus:ring-4 focus:ring-blue-500/10 ${
                        selected
                          ? 'border-blue-500 bg-blue-50/70'
                          : 'border-slate-200 bg-white hover:-translate-y-0.5 hover:border-slate-300 hover:shadow-lg hover:shadow-slate-200/50 dark:border-slate-700 dark:bg-slate-900'
                      } ${index === 0 ? 'sm:col-span-2' : ''}`}
                    >
                      <span
                        className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl transition ${
                          selected
                            ? 'bg-blue-600 text-white shadow-md shadow-blue-500/20'
                            : 'bg-slate-100 text-slate-500 group-hover:bg-slate-900 group-hover:text-white dark:bg-slate-800 dark:text-slate-400'
                        }`}
                      >
                        {option.icon}
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block text-sm font-bold text-slate-900 dark:text-slate-100">
                          {option.label}
                        </span>
                        <span className="mt-1 block text-xs leading-5 text-slate-500 dark:text-slate-400">
                          {option.description}
                        </span>
                      </span>
                      <span
                        className={`flex h-5 w-5 items-center justify-center rounded-full border transition ${
                          selected
                            ? 'border-blue-600 bg-blue-600 text-white'
                            : 'border-slate-300 text-transparent'
                        }`}
                      >
                        {icons.check}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {step === 2 && (
            <div className="space-y-7">
              <div className="grid gap-5 sm:grid-cols-2">
                <SelectField
                  label="Filial"
                  value={draft.branch}
                  onChange={(branch) => setDraft({ ...draft, branch })}
                >
                  <option>Goiânia — Matriz</option>
                  <option>Anápolis — Filial</option>
                </SelectField>
                <SelectField
                  label="Depósito"
                  value={draft.warehouse}
                  onChange={(warehouse) => setDraft({ ...draft, warehouse })}
                >
                  <option>Depósito Central</option>
                  <option>Loja / Pronta-entrega</option>
                  <option>Quarentena</option>
                </SelectField>
                {draft.type === 'CATEGORY' && (
                  <SelectField
                    label="Categoria"
                    value={draft.category}
                    onChange={(category) => setDraft({ ...draft, category })}
                  >
                    <option value="">Selecione uma categoria</option>
                    <option>Sementes</option>
                    <option>Fertilizantes</option>
                    <option>Defensivos</option>
                  </SelectField>
                )}
                <SelectField
                  label="Responsável"
                  value={draft.responsible}
                  onChange={(responsible) => setDraft({ ...draft, responsible })}
                >
                  <option>Marina Alves</option>
                  <option>Carlos Henrique</option>
                  <option>Equipe de conferência</option>
                </SelectField>
              </div>

              <fieldset>
                <legend className="mb-3 text-[11px] font-bold uppercase tracking-[0.16em] text-slate-500 dark:text-slate-400">
                  Movimentações durante a contagem
                </legend>
                <div className="grid gap-3 sm:grid-cols-2">
                  {[
                    {
                      value: 'FREEZE' as const,
                      title: 'Congelar estoque',
                      copy: 'Bloqueia entradas e saídas até a conclusão.',
                      badge: 'Mais seguro',
                    },
                    {
                      value: 'SNAPSHOT' as const,
                      title: 'Permitir e conciliar',
                      copy: 'Registra movimentos para compensar na revisão.',
                      badge: 'Operação contínua',
                    },
                  ].map((policy) => (
                    <button
                      key={policy.value}
                      type="button"
                      onClick={() => setDraft({ ...draft, policy: policy.value })}
                      className={`rounded-2xl border p-4 text-left transition focus:outline-none focus:ring-4 focus:ring-blue-500/10 ${
                        draft.policy === policy.value
                          ? 'border-blue-500 bg-blue-50/60'
                          : 'border-slate-200 hover:border-slate-300 dark:border-slate-700'
                      }`}
                    >
                      <span className="flex items-center justify-between gap-3">
                        <span className="text-sm font-bold text-slate-900 dark:text-slate-100">
                          {policy.title}
                        </span>
                        <span className="rounded-full bg-slate-100 px-2 py-1 text-[10px] font-bold uppercase tracking-wide text-slate-500 dark:bg-slate-800 dark:text-slate-400">
                          {policy.badge}
                        </span>
                      </span>
                      <span className="mt-2 block text-xs leading-5 text-slate-500 dark:text-slate-400">
                        {policy.copy}
                      </span>
                    </button>
                  ))}
                </div>
              </fieldset>

              <label className="block">
                <span className="mb-2 block text-[11px] font-bold uppercase tracking-[0.16em] text-slate-500 dark:text-slate-400">
                  Observação{' '}
                  <span className="font-medium normal-case tracking-normal text-slate-400">
                    (opcional)
                  </span>
                </span>
                <textarea
                  rows={3}
                  value={draft.notes}
                  onChange={(event) => setDraft({ ...draft, notes: event.target.value })}
                  placeholder="Ex.: priorizar o corredor B e produtos com validade próxima"
                  className="w-full resize-none rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-800 outline-none transition placeholder:text-slate-400 focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200"
                />
              </label>
            </div>
          )}

          {step === 3 && (
            <div>
              <div className="relative overflow-hidden rounded-3xl bg-slate-950 p-6 text-white sm:p-7">
                <div className="absolute -right-16 -top-20 h-56 w-56 rounded-full bg-blue-600/30 blur-3xl" />
                <div className="relative">
                  <div className="flex items-start justify-between gap-4">
                    <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-blue-500 text-white shadow-lg shadow-blue-500/25">
                      {selectedType.icon}
                    </span>
                    <span className="rounded-full border border-emerald-400/20 bg-emerald-400/10 px-3 py-1 text-[10px] font-bold uppercase tracking-[0.14em] text-emerald-300">
                      Pronto para abrir
                    </span>
                  </div>
                  <h3 className="mt-5 text-2xl font-semibold">
                    Inventário {selectedType.label.toLowerCase()}
                  </h3>
                  <p className="mt-1 text-sm text-slate-400">
                    {draft.branch}{' '}
                    <span className="px-1 text-slate-600 dark:text-slate-300">/</span>{' '}
                    {draft.warehouse}
                  </p>
                  <div className="mt-6 grid grid-cols-2 gap-px overflow-hidden rounded-2xl bg-white/10 sm:grid-cols-3">
                    {[
                      ['Responsável', draft.responsible],
                      ['Movimentações', draft.policy === 'FREEZE' ? 'Congeladas' : 'Conciliadas'],
                      ['Início', 'Agora'],
                    ].map(([label, value]) => (
                      <div
                        key={label}
                        className="bg-white/[0.06] p-4 last:col-span-2 sm:last:col-span-1"
                      >
                        <span className="block text-[10px] font-bold uppercase tracking-[0.14em] text-slate-500 dark:text-slate-400">
                          {label}
                        </span>
                        <span className="mt-1.5 block truncate text-sm font-semibold text-slate-100">
                          {value}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              <div className="mt-5 flex gap-3 rounded-2xl border border-blue-100 bg-blue-50 p-4 text-blue-900">
                <span className="mt-0.5 shrink-0 text-blue-600">{icons.spark}</span>
                <p className="text-xs leading-5">
                  <strong className="font-bold">Contagem cega ativada.</strong> A quantidade do
                  sistema ficará oculta para o conferente e aparecerá somente na revisão das
                  divergências.
                </p>
              </div>
            </div>
          )}
        </div>

        <footer className="flex items-center justify-between gap-3 border-t border-slate-100 bg-slate-50/70 px-6 py-4 sm:px-8">
          <button
            type="button"
            onClick={() => (step === 1 ? requestClose() : setStep(step - 1))}
            className="h-11 rounded-xl px-4 text-sm font-bold text-slate-600 transition hover:bg-slate-200/70 hover:text-slate-950 focus:outline-none focus:ring-4 focus:ring-slate-400/15 dark:text-slate-300"
          >
            {step === 1 ? 'Cancelar' : 'Voltar'}
          </button>
          <button
            type="button"
            disabled={step === 2 && draft.type === 'CATEGORY' && !draft.category}
            onClick={() => (step < 3 ? setStep(step + 1) : (onCreate(draft), requestClose()))}
            className="flex h-11 items-center gap-2 rounded-xl bg-blue-600 px-5 text-sm font-bold text-white shadow-lg shadow-blue-600/20 transition hover:-translate-y-0.5 hover:bg-blue-700 hover:shadow-xl focus:outline-none focus:ring-4 focus:ring-blue-500/20 disabled:pointer-events-none disabled:opacity-40"
          >
            {step === 3 ? 'Abrir inventário' : 'Continuar'} {step < 3 && icons.arrow}
          </button>
        </footer>
      </div>
    </div>
  );
}

const divergences = [
  {
    product: 'Semente de Milho AG 8700',
    sku: 'SEM-8700',
    system: 240,
    counted: 237,
    cost: -546,
    user: 'MA',
  },
  {
    product: 'Herbicida Glifosato 20L',
    sku: 'DEF-0042',
    system: 84,
    counted: 86,
    cost: 720,
    user: 'CH',
  },
  {
    product: 'Fertilizante NPK 04-14-08',
    sku: 'FER-1408',
    system: 510,
    counted: 508,
    cost: -298,
    user: 'MA',
  },
];

export function InventoryScreen() {
  const [modalOpen, setModalOpen] = useState(false);
  const [created, setCreated] = useState(false);

  const create = (_draft: InventoryDraft) => {
    setModalOpen(false);
    setCreated(true);
    window.setTimeout(() => setCreated(false), 4500);
  };

  return (
    <main className="bg-canvas-light relative min-h-screen overflow-hidden text-slate-950 dark:bg-slate-950 dark:text-slate-100">
      <div className="relative mx-auto max-w-7xl px-5 py-8 sm:px-8 lg:px-10 lg:py-10">
        <header className="flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-[0.18em] text-blue-600">
              <span className="h-1.5 w-1.5 rounded-full bg-blue-600" /> Operações de estoque
            </div>
            <h1 className="mt-3 text-3xl font-bold tracking-[-0.035em] text-slate-950 sm:text-4xl dark:text-slate-100">
              Inventário
            </h1>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-500 dark:text-slate-400">
              Conte, concilie e ajuste seu estoque com rastreabilidade de ponta a ponta.
            </p>
          </div>
          <button
            type="button"
            onClick={() => setModalOpen(true)}
            className="group flex h-12 items-center justify-center gap-2 rounded-xl bg-slate-950 px-5 text-sm font-bold text-white shadow-xl shadow-slate-950/15 transition hover:-translate-y-0.5 hover:bg-blue-600 focus:outline-none focus:ring-4 focus:ring-blue-500/20"
          >
            <span className="text-lg font-light leading-none">+</span> Novo inventário
            <span className="transition group-hover:translate-x-0.5">{icons.chevron}</span>
          </button>
        </header>

        <section className="mt-8 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {[
            {
              label: 'Itens no escopo',
              value: '1.284',
              detail: 'Depósito Central',
              icon: icons.boxes,
              color: 'text-blue-600 bg-blue-50',
            },
            {
              label: 'Contagem concluída',
              value: '78%',
              detail: '1.002 de 1.284 itens',
              icon: icons.scan,
              color: 'text-violet-600 bg-violet-50',
            },
            {
              label: 'Itens divergentes',
              value: '23',
              detail: '2,3% dos conferidos',
              icon: icons.chart,
              color: 'text-amber-600 bg-amber-50',
            },
            {
              label: 'Impacto estimado',
              value: money(-124),
              detail: 'Saldo líquido da diferença',
              icon: icons.spark,
              color: 'text-rose-600 bg-rose-50',
            },
          ].map((metric) => (
            <article
              key={metric.label}
              className="border-hairline-light bg-canvas-light rounded-2xl border p-5"
            >
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-xs font-semibold text-slate-500 dark:text-slate-400">
                    {metric.label}
                  </p>
                  <strong className="mt-2 block text-2xl font-bold tracking-tight text-slate-950 dark:text-slate-100">
                    {metric.value}
                  </strong>
                </div>
                <span
                  className={`flex h-10 w-10 items-center justify-center rounded-xl ${metric.color}`}
                >
                  {metric.icon}
                </span>
              </div>
              <p className="mt-3 text-xs text-slate-400">{metric.detail}</p>
            </article>
          ))}
        </section>

        <section className="border-hairline-light bg-canvas-light mt-5 overflow-hidden rounded-3xl border dark:bg-slate-900">
          <div className="flex flex-col gap-5 border-b border-slate-100 p-6 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-4">
              <span className="relative flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-950 text-white">
                {icons.scan}
                <span className="absolute -right-1 -top-1 h-3 w-3 rounded-full border-2 border-white bg-emerald-400" />
              </span>
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="font-bold text-slate-950 dark:text-slate-100">
                    Inventário rotativo · Setembro
                  </h2>
                  <span className="rounded-full bg-emerald-50 px-2 py-1 text-[10px] font-bold uppercase tracking-wide text-emerald-700">
                    Em contagem
                  </span>
                </div>
                <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                  Depósito Central · iniciado hoje às 08:42 por Marina Alves
                </p>
              </div>
            </div>
            <button
              type="button"
              className="flex items-center justify-center gap-2 rounded-xl border border-slate-200 px-4 py-2.5 text-xs font-bold text-slate-700 transition hover:border-blue-200 hover:bg-blue-50 hover:text-blue-700 dark:border-slate-700 dark:text-slate-300"
            >
              Continuar contagem {icons.arrow}
            </button>
          </div>
          <div className="px-6 py-5">
            <div className="flex items-center justify-between text-xs font-semibold text-slate-500 dark:text-slate-400">
              <span>Progresso da conferência</span>
              <span className="text-slate-900 dark:text-slate-100">1.002 / 1.284</span>
            </div>
            <div className="mt-3 h-2 overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
              <div className="h-full w-[78%] rounded-full bg-gradient-to-r from-blue-600 to-cyan-400 shadow-sm" />
            </div>
          </div>
        </section>

        <section className="border-hairline-light bg-canvas-light mt-5 overflow-hidden rounded-3xl border dark:bg-slate-900">
          <div className="flex items-center justify-between border-b border-slate-100 px-6 py-5">
            <div>
              <h2 className="font-bold text-slate-950 dark:text-slate-100">
                Divergências recentes
              </h2>
              <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                Comparativo entre saldo do sistema e quantidade contada
              </p>
            </div>
            <button type="button" className="text-xs font-bold text-blue-600 hover:text-blue-800">
              Ver relatório completo
            </button>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[720px] text-left">
              <thead>
                <tr className="bg-slate-50/70 text-[10px] font-bold uppercase tracking-[0.14em] text-slate-400">
                  <th className="px-6 py-3">Produto</th>
                  <th className="px-4 py-3 text-right">Sistema</th>
                  <th className="px-4 py-3 text-right">Contado</th>
                  <th className="px-4 py-3 text-right">Diferença</th>
                  <th className="px-4 py-3 text-right">Impacto</th>
                  <th className="px-6 py-3 text-center">Responsável</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {divergences.map((row) => {
                  const difference = row.counted - row.system;
                  return (
                    <tr key={row.sku} className="text-sm transition hover:bg-slate-50/80">
                      <td className="px-6 py-4">
                        <span className="block font-semibold text-slate-800 dark:text-slate-200">
                          {row.product}
                        </span>
                        <span className="mt-0.5 block text-[11px] text-slate-400">
                          SKU {row.sku}
                        </span>
                      </td>
                      <td className="px-4 py-4 text-right font-medium text-slate-500 dark:text-slate-400">
                        {row.system}
                      </td>
                      <td className="px-4 py-4 text-right font-bold text-slate-800 dark:text-slate-200">
                        {row.counted}
                      </td>
                      <td
                        className={`px-4 py-4 text-right font-bold ${difference > 0 ? 'text-emerald-600' : 'text-rose-600'}`}
                      >
                        {difference > 0 ? '+' : ''}
                        {difference}
                      </td>
                      <td
                        className={`px-4 py-4 text-right font-semibold ${row.cost > 0 ? 'text-emerald-600' : 'text-rose-600'}`}
                      >
                        {money(row.cost)}
                      </td>
                      <td className="px-6 py-4">
                        <span className="mx-auto flex h-8 w-8 items-center justify-center rounded-full bg-slate-900 text-[10px] font-bold text-white">
                          {row.user}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </section>
      </div>

      {created && (
        <div
          role="status"
          className="fixed bottom-6 right-6 z-40 flex max-w-sm items-center gap-3 rounded-2xl bg-slate-950 px-5 py-4 text-sm font-semibold text-white shadow-2xl"
        >
          <span className="flex h-8 w-8 items-center justify-center rounded-full bg-emerald-400 text-slate-950 dark:text-slate-100">
            {icons.check}
          </span>
          Inventário aberto. A equipe já pode iniciar a leitura.
        </div>
      )}
      {modalOpen && <NewInventoryModal onClose={() => setModalOpen(false)} onCreate={create} />}
    </main>
  );
}
