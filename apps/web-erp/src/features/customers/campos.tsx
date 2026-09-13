import { ChevronDown, CircleAlert, type LucideIcon } from 'lucide-react';
import { useId, type ReactNode } from 'react';

/** Campos do cadastro, na linguagem do Synapse: rótulo em cima, controle
 *  embaixo, erro no lugar da dica. Nada de asterisco vermelho solto — o campo
 *  obrigatório diz o que falta quando falta.
 *
 *  Profundidade sem peso: o cartão flutua sobre o fundo cinza da janela com a
 *  sombra do sistema, e o campo afunda de leve no cartão (fundo quase branco e
 *  sombra interna) até ganhar foco, quando clareia e ganha o anel cobalto. */

/** O que todo controle tem: raio, texto, anel de foco e o estado desabilitado,
 *  que perde a borda e vira superfície — dá para ver que ali não se edita. */
const SUPERFICIE =
  'text-body-sm text-ink w-full rounded-xl border outline-none transition duration-200 placeholder:text-stone focus:ring-4 disabled:cursor-not-allowed disabled:border-transparent disabled:bg-surface-soft disabled:text-mute disabled:shadow-none';

const NORMAL =
  'border-hairline-light bg-[#fcfcfd] shadow-[inset_0_1px_2px_rgba(25,28,31,0.05)] hover:border-faint focus:border-primary focus:bg-white focus:ring-primary/15';

/** Erro numa classe à parte, e não somado à normal: duas cores de borda na mesma
 *  lista deixam o CSS escolher, e o vermelho perdia para o cinza. */
const INVALIDO = 'border-[#b3242f] bg-[#fff8f8] focus:border-[#b3242f] focus:ring-[#b3242f]/15';

const controle = (invalido: boolean, extra: string) =>
  `${SUPERFICIE} ${invalido ? INVALIDO : NORMAL} ${extra}`;

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
  return <div className={`grid grid-cols-2 gap-x-4 gap-y-4 ${grade}`}>{children}</div>;
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
      <label htmlFor={id} className="text-caption text-charcoal mb-1.5 block font-medium">
        {rotulo}
      </label>
      {children({ id, invalido: Boolean(erro) })}
      {erro ? (
        <p className="text-caption mt-1.5 flex items-start gap-1 text-[#b3242f]">
          <CircleAlert size={13} aria-hidden="true" className="mt-px shrink-0" />
          {erro}
        </p>
      ) : dica ? (
        <p className="text-caption text-stone mt-1.5">{dica}</p>
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
        className={controle(
          invalido,
          `h-11 px-3.5 ${alinharADireita ? 'text-right tabular-nums' : ''}`,
        )}
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

/** Seleção com a seta visível: sem ela, "Pessoa jurídica" parecia texto
 *  digitado, e ninguém sabia que ali abria uma lista. */
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
    <div className="relative">
      <select
        id={id}
        value={valor}
        disabled={disabled}
        onChange={(evento) => aoMudar(evento.target.value as T)}
        aria-invalid={invalido || undefined}
        className={controle(invalido, 'h-11 cursor-pointer appearance-none pl-3.5 pr-10')}
      >
        {opcoes.map(([chave, rotulo]) => (
          <option key={chave} value={chave}>
            {rotulo}
          </option>
        ))}
      </select>
      <ChevronDown
        size={16}
        aria-hidden="true"
        className="text-stone pointer-events-none absolute right-3.5 top-1/2 -translate-y-1/2"
      />
    </div>
  );
}

/** Caixa de marcar como um cartão pequeno: a área inteira clica, e marcada ela
 *  ganha o tom cobalto — dá para ler as opções ligadas de relance. */
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
  const tom = marcado
    ? 'border-brand-200 bg-brand-50'
    : 'border-hairline-light bg-white hover:border-faint';
  return (
    <label
      className={`flex items-start gap-3 rounded-xl border px-3.5 py-3 transition duration-200 ${tom} ${
        disabled ? 'cursor-not-allowed opacity-60' : 'cursor-pointer'
      }`}
    >
      <input
        type="checkbox"
        checked={marcado}
        disabled={disabled}
        onChange={(evento) => aoAlternar(evento.target.checked)}
        className="accent-primary mt-0.5 h-4 w-4 shrink-0 cursor-pointer rounded"
      />
      <span className="min-w-0">
        <span className="text-body-sm text-ink block font-medium">{rotulo}</span>
        {dica ? <span className="text-caption text-stone mt-0.5 block">{dica}</span> : null}
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
      className={controle(false, 'resize-y px-3.5 py-2.5')}
    />
  );
}

/** Cartão de assunto dentro da aba. O ícone e a linha de descrição dizem do que
 *  o cartão trata antes de a pessoa ler os campos; a sombra o separa do fundo. */
export function Bloco({
  titulo,
  descricao,
  icone: Icone,
  acao,
  children,
}: {
  readonly titulo: string;
  readonly descricao?: string | undefined;
  readonly icone?: LucideIcon | undefined;
  readonly acao?: ReactNode | undefined;
  readonly children: ReactNode;
}) {
  return (
    <section className="border-hairline-light shadow-cartao hover:shadow-cartao-alto rounded-2xl border bg-white transition-shadow duration-300">
      <header className="border-hairline-light flex min-h-[64px] items-center justify-between gap-3 border-b px-5 py-3">
        <div className="flex min-w-0 items-center gap-3">
          {Icone ? (
            <span className="bg-brand-50 text-primary flex h-9 w-9 shrink-0 items-center justify-center rounded-xl">
              <Icone size={17} aria-hidden="true" />
            </span>
          ) : null}
          <div className="min-w-0">
            <h3 className="font-display text-body-md text-ink font-semibold tracking-[-0.1px]">
              {titulo}
            </h3>
            {descricao ? <p className="text-caption text-stone truncate">{descricao}</p> : null}
          </div>
        </div>
        {acao}
      </header>
      <div className="p-5">{children}</div>
    </section>
  );
}
