import { CircleAlert, FileQuestion, LoaderCircle } from 'lucide-react';
import { useEffect, useRef, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { useEscParaFechar } from './useEscParaFechar';

/** Superficies que a analise usa em varios lugares: secao compacta, par
 *  rotulo/valor, estados de carga e o dialogo modal. */

export function Secao({
  titulo,
  acao,
  children,
  className = '',
}: {
  readonly titulo: string;
  readonly acao?: ReactNode;
  readonly children: ReactNode;
  readonly className?: string;
}) {
  return (
    <section
      className={`border-hairline-light bg-canvas-light shadow-cartao rounded-2xl border p-4 ${className}`}
    >
      <header className="mb-3 flex min-h-7 items-center justify-between gap-3">
        <h3 className="text-caption text-stone font-semibold uppercase tracking-[0.08em]">
          {titulo}
        </h3>
        {acao}
      </header>
      {children}
    </section>
  );
}

/** Rotulo em cima, valor embaixo. `vazio` e o que aparece quando nao ha dado —
 *  sempre dito em palavras, nunca um campo em branco. */
export function Dado({
  rotulo,
  children,
  vazio = 'Não informado',
  largo = false,
}: {
  readonly rotulo: string;
  readonly children?: ReactNode;
  readonly vazio?: string;
  readonly largo?: boolean;
}) {
  const semValor = children === null || children === undefined || children === '';
  return (
    <div className={largo ? 'col-span-full' : 'min-w-0'}>
      <dt className="text-caption text-stone">{rotulo}</dt>
      <dd
        className={`text-body-sm mt-0.5 break-words ${
          semValor ? 'text-stone italic' : 'text-ink font-semibold tabular-nums'
        }`}
      >
        {semValor ? vazio : children}
      </dd>
    </div>
  );
}

export function Dados({
  children,
  colunas = 3,
}: {
  readonly children: ReactNode;
  readonly colunas?: 2 | 3 | 4;
}) {
  const grade = { 2: 'sm:grid-cols-2', 3: 'sm:grid-cols-3', 4: 'sm:grid-cols-4' }[colunas];
  return <dl className={`grid grid-cols-2 gap-x-5 gap-y-3 ${grade}`}>{children}</dl>;
}

export function Carregando({ texto = 'Carregando…' }: { readonly texto?: string }) {
  return (
    <p
      role="status"
      className="text-body-sm text-stone flex items-center justify-center gap-2 py-10"
    >
      <LoaderCircle
        size={16}
        className="animate-spin motion-reduce:animate-none"
        aria-hidden="true"
      />
      {texto}
    </p>
  );
}

export function Falha({ titulo, texto }: { readonly titulo: string; readonly texto: string }) {
  return (
    <div role="alert" className="flex flex-col items-start gap-2 p-6">
      <span className="bg-surface-soft flex h-10 w-10 items-center justify-center rounded-full text-[#b3242f]">
        <CircleAlert size={18} aria-hidden="true" />
      </span>
      <p className="text-body-md text-ink font-semibold">{titulo}</p>
      <p className="text-body-sm text-mute">{texto}</p>
    </div>
  );
}

export function Ausente({ texto }: { readonly texto: string }) {
  return (
    <p className="text-body-sm text-stone flex items-center gap-2 py-3">
      <FileQuestion size={15} aria-hidden="true" className="shrink-0" />
      {texto}
    </p>
  );
}

/** Dialogo modal por cima de tudo. Esc fecha; o foco vai para o primeiro campo
 *  ou botao que o conteudo marcar com `data-autofoco`. */
export function Dialogo({
  rotulo,
  aoFechar,
  children,
  largura = 'max-w-md',
}: {
  readonly rotulo: string;
  readonly aoFechar: () => void;
  readonly children: ReactNode;
  readonly largura?: string;
}) {
  const caixa = useRef<HTMLDivElement>(null);
  useEscParaFechar(aoFechar);
  useEffect(() => {
    caixa.current?.querySelector<HTMLElement>('[data-autofoco]')?.focus();
  }, []);

  return createPortal(
    <div className="bg-canvas-dark/30 animate-revelar fixed inset-0 z-[90] flex items-center justify-center p-4 backdrop-blur-[2px] motion-reduce:animate-none">
      <div
        ref={caixa}
        role="dialog"
        aria-modal="true"
        aria-label={rotulo}
        className={`bg-canvas-light shadow-janela animate-surgir max-h-[calc(100vh-2rem)] w-full overflow-y-auto rounded-2xl p-6 motion-reduce:animate-none ${largura}`}
      >
        {children}
      </div>
    </div>,
    document.body,
  );
}

export const BOTAO_CLARO =
  'bg-surface-soft text-button-sm text-ink inline-flex h-9 items-center gap-2 rounded-full px-4 transition hover:bg-[#ececee] disabled:cursor-not-allowed disabled:opacity-40';

export const BOTAO_ESCURO =
  'bg-canvas-dark text-button-sm hover:bg-charcoal inline-flex h-9 items-center gap-2 rounded-full px-4 text-white transition disabled:cursor-not-allowed disabled:opacity-40';

export const BOTAO_ALERTA =
  'text-button-sm inline-flex h-9 items-center gap-2 rounded-full bg-[#b3242f] px-4 text-white transition hover:bg-[#931d27] disabled:cursor-not-allowed disabled:opacity-40';

export const BOTAO_REPROVAR =
  'bg-surface-soft text-button-sm inline-flex h-9 items-center gap-2 rounded-full px-4 text-[#b3242f] transition hover:bg-[#fdeced] disabled:cursor-not-allowed disabled:opacity-40';
