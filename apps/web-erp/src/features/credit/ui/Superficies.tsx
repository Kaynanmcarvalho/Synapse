import { CircleAlert, FileQuestion, LoaderCircle } from 'lucide-react';
import { type ReactNode } from 'react';

/** Superficies que a analise usa em varios lugares: secao compacta, par
 *  rotulo/valor e estados de carga.
 *
 *  Fase 6.4: `Dialogo` e os estilos `BOTAO_*` moraram aqui até esta fase —
 *  nunca tiveram nada específico de crédito, só nasceram junto com a
 *  primeira fila. Agora vivem em `components/dialogo/Dialogo`, reexportados
 *  abaixo para não quebrar os consumidores já existentes neste domínio. */
export {
  Dialogo,
  BOTAO_ALERTA,
  BOTAO_CLARO,
  BOTAO_ESCURO,
  BOTAO_REPROVAR,
} from '../../../components/dialogo/Dialogo';

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
