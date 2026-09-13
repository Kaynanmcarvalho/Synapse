import { useId, type ReactNode } from 'react';

/** Campos do cadastro, na linguagem do Synapse: rótulo em cima, controle
 *  embaixo, erro no lugar da dica. Nada de asterisco vermelho solto — o campo
 *  obrigatório diz o que falta quando falta. */

const CONTROLE =
  'border-hairline-light text-body-sm text-ink focus:border-hairline-strong h-9 w-full rounded-xl border bg-white px-3 outline-none transition disabled:cursor-not-allowed disabled:bg-[#f5f5f6] disabled:text-stone';

const COM_ERRO = 'border-[#b3242f] focus:border-[#b3242f]';

export function Grade({
  colunas = 4,
  children,
}: {
  readonly colunas?: 2 | 3 | 4 | 6 | undefined;
  readonly children: ReactNode;
}) {
  const grade = {
    2: 'sm:grid-cols-2',
    3: 'sm:grid-cols-3',
    4: 'sm:grid-cols-4',
    6: 'sm:grid-cols-6',
  }[colunas];
  return <div className={`grid grid-cols-2 gap-x-4 gap-y-3 ${grade}`}>{children}</div>;
}

export function Campo({
  rotulo,
  children,
  dica,
  erro,
  largura = 1,
}: {
  readonly rotulo: string;
  readonly children: (props: { readonly id: string; readonly invalido: boolean }) => ReactNode;
  readonly dica?: string | undefined;
  readonly erro?: string | null | undefined;
  /** Quantas colunas da grade o campo ocupa. */
  readonly largura?: 1 | 2 | 3 | 4 | 'tudo' | undefined;
}) {
  const id = useId();
  const span = {
    1: '',
    2: 'col-span-2',
    3: 'col-span-2 sm:col-span-3',
    4: 'col-span-2 sm:col-span-4',
    tudo: 'col-span-full',
  }[largura];
  return (
    <div className={`min-w-0 ${span}`}>
      <label htmlFor={id} className="text-caption text-stone block">
        {rotulo}
      </label>
      <div className="mt-1">{children({ id, invalido: Boolean(erro) })}</div>
      {erro ? (
        <p className="text-caption mt-1 text-[#b3242f]">{erro}</p>
      ) : dica ? (
        <p className="text-caption text-stone mt-1">{dica}</p>
      ) : null}
    </div>
  );
}

export interface PropsDoTexto {
  readonly valor: string;
  readonly aoMudar: (valor: string) => void;
  readonly id?: string | undefined;
  readonly invalido?: boolean | undefined;
  readonly placeholder?: string | undefined;
  readonly maxLength?: number | undefined;
  readonly disabled?: boolean | undefined;
  readonly type?: 'text' | 'email' | 'date' | 'number' | undefined;
  readonly sugestoes?: readonly string[] | undefined;
  readonly listaId?: string | undefined;
  readonly autoFocus?: boolean | undefined;
  readonly inputMode?: 'text' | 'numeric' | 'decimal' | 'tel' | 'email' | undefined;
  readonly alinharADireita?: boolean | undefined;
}

export function Texto({
  valor,
  aoMudar,
  id,
  invalido = false,
  sugestoes,
  listaId,
  alinharADireita = false,
  ...resto
}: PropsDoTexto) {
  const idDaLista = useId();
  const lista = sugestoes?.length ? (listaId ?? idDaLista) : undefined;
  return (
    <>
      <input
        id={id}
        value={valor}
        onChange={(evento) => aoMudar(evento.target.value)}
        aria-invalid={invalido || undefined}
        list={lista}
        className={`${CONTROLE} ${invalido ? COM_ERRO : ''} ${alinharADireita ? 'text-right tabular-nums' : ''}`}
        {...resto}
      />
      {lista && sugestoes ? (
        <datalist id={lista}>
          {sugestoes.map((sugestao) => (
            <option key={sugestao} value={sugestao} />
          ))}
        </datalist>
      ) : null}
    </>
  );
}

export function Selecao<T extends string>({
  valor,
  aoMudar,
  opcoes,
  id,
  invalido = false,
  disabled = false,
}: {
  readonly valor: T;
  readonly aoMudar: (valor: T) => void;
  readonly opcoes: ReadonlyArray<readonly [T, string]>;
  readonly id?: string | undefined;
  readonly invalido?: boolean | undefined;
  readonly disabled?: boolean | undefined;
}) {
  return (
    <select
      id={id}
      value={valor}
      disabled={disabled}
      onChange={(evento) => aoMudar(evento.target.value as T)}
      aria-invalid={invalido || undefined}
      className={`${CONTROLE} ${invalido ? COM_ERRO : ''} appearance-none pr-8`}
    >
      {opcoes.map(([chave, rotulo]) => (
        <option key={chave} value={chave}>
          {rotulo}
        </option>
      ))}
    </select>
  );
}

export function Caixa({
  rotulo,
  marcado,
  aoAlternar,
  dica,
  disabled = false,
}: {
  readonly rotulo: string;
  readonly marcado: boolean;
  readonly aoAlternar: (marcado: boolean) => void;
  readonly dica?: string | undefined;
  readonly disabled?: boolean | undefined;
}) {
  return (
    <label className="flex items-start gap-2">
      <input
        type="checkbox"
        checked={marcado}
        disabled={disabled}
        onChange={(evento) => aoAlternar(evento.target.checked)}
        className="border-hairline-strong accent-canvas-dark mt-0.5 h-4 w-4 rounded"
      />
      <span className="min-w-0">
        <span className="text-body-sm text-ink block">{rotulo}</span>
        {dica ? <span className="text-caption text-stone block">{dica}</span> : null}
      </span>
    </label>
  );
}

export function Area({
  valor,
  aoMudar,
  id,
  linhas = 3,
  maxLength = 1000,
  placeholder,
}: {
  readonly valor: string;
  readonly aoMudar: (valor: string) => void;
  readonly id?: string | undefined;
  readonly linhas?: number | undefined;
  readonly maxLength?: number | undefined;
  readonly placeholder?: string | undefined;
}) {
  return (
    <textarea
      id={id}
      value={valor}
      rows={linhas}
      maxLength={maxLength}
      placeholder={placeholder}
      onChange={(evento) => aoMudar(evento.target.value)}
      className="border-hairline-light text-body-sm text-ink focus:border-hairline-strong w-full resize-y rounded-xl border bg-white px-3 py-2 outline-none transition"
    />
  );
}

/** Bloco com título dentro da aba, para separar assunto sem pesar a tela. */
export function Bloco({
  titulo,
  acao,
  children,
}: {
  readonly titulo: string;
  readonly acao?: ReactNode | undefined;
  readonly children: ReactNode;
}) {
  return (
    <section className="border-hairline-light rounded-2xl border bg-white p-4">
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
