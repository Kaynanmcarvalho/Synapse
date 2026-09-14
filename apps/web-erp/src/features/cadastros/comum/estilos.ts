/** Botões e selos das telas de cadastro do Syndata, no desenho do Synapse. */

export const BOTAO_CLARO =
  'bg-surface-soft text-button-sm text-ink inline-flex h-10 items-center gap-2 rounded-full px-4 transition hover:bg-[#ececee] disabled:cursor-not-allowed disabled:opacity-40';

export const BOTAO_ESCURO =
  'bg-canvas-dark text-button-sm hover:bg-charcoal shadow-cartao inline-flex h-10 items-center gap-2 rounded-full px-5 text-white transition disabled:cursor-not-allowed disabled:opacity-40';

export const BOTAO_ICONE =
  'border-hairline-light text-charcoal hover:border-faint hover:text-ink inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border bg-white transition disabled:cursor-not-allowed disabled:opacity-40';

export const BOTAO_PEQUENO =
  'bg-surface-soft text-caption text-ink inline-flex h-8 items-center gap-1.5 rounded-full px-3 font-medium transition hover:bg-[#ececee] disabled:cursor-not-allowed disabled:opacity-40';

export type Tom = 'neutro' | 'positivo' | 'alerta' | 'perigo';

export const TOM: Readonly<Record<Tom, string>> = {
  neutro: 'bg-surface-soft text-charcoal',
  positivo: 'bg-[#e6f6f1] text-[#00664d]',
  alerta: 'bg-[#fff3e0] text-[#8a4b00]',
  perigo: 'bg-[#fdeced] text-[#b3242f]',
};

export const SELO = 'text-caption inline-flex h-6 items-center rounded-full px-2.5 font-medium';

export const INPUT_DE_BUSCA =
  'border-hairline-light text-body-sm text-ink focus:border-primary focus:ring-primary/15 h-10 w-full rounded-xl border bg-white px-3.5 outline-none transition focus:ring-4';
