import { ChevronDown, Eye, EyeOff } from 'lucide-react';
import {
  type InputHTMLAttributes,
  type KeyboardEvent,
  type ReactNode,
  type TextareaHTMLAttributes,
  useId,
  useState,
} from 'react';
import type { Aba } from './assistente.tipos';

export const CLASSE_CAMPO =
  'h-11 w-full rounded-xl border border-hairline-light bg-canvas-light px-3.5 text-body-sm text-ink outline-none transition placeholder:text-stone focus:border-hairline-strong focus:ring-4 focus:ring-primary/15 disabled:cursor-not-allowed disabled:bg-surface-soft disabled:text-mute';

export const BOTAO_PRIMARIO =
  'inline-flex h-11 items-center justify-center gap-2 rounded-full bg-canvas-dark px-5 text-button-sm text-white transition hover:bg-charcoal disabled:cursor-not-allowed disabled:bg-faint';

export const BOTAO_SECUNDARIO =
  'inline-flex h-11 items-center justify-center gap-2 rounded-full border border-hairline-light bg-canvas-light px-5 text-button-sm text-ink transition hover:border-hairline-strong disabled:cursor-not-allowed disabled:text-stone disabled:hover:border-hairline-light';

export const BOTAO_ICONE =
  'flex h-9 w-9 items-center justify-center rounded-full text-charcoal transition hover:bg-surface-soft hover:text-ink disabled:cursor-not-allowed disabled:text-faint disabled:hover:bg-transparent';

const CLASSE_ROTULO = 'mb-1.5 block text-caption font-medium text-mute';

type PropsDeCampo = {
  readonly rotulo: string;
  readonly dica?: ReactNode;
  readonly acessorio?: ReactNode;
  /** Classe do contorno (largura na grade), nao do input. */
  readonly className?: string | undefined;
} & Omit<InputHTMLAttributes<HTMLInputElement>, 'className'>;

export function Campo({ rotulo, dica, acessorio, className, ...props }: PropsDeCampo) {
  const id = useId();
  return (
    <div className={className}>
      <label htmlFor={id} className={CLASSE_ROTULO}>
        {rotulo}
      </label>
      <div className="relative">
        <input id={id} className={`${CLASSE_CAMPO} ${acessorio ? 'pr-12' : ''}`} {...props} />
        {acessorio && (
          <div className="absolute inset-y-0 right-1 flex items-center">{acessorio}</div>
        )}
      </div>
      {dica && <p className="text-caption text-stone mt-1.5">{dica}</p>}
    </div>
  );
}

export function AreaDeTexto({
  rotulo,
  className,
  ...props
}: { readonly rotulo: string; readonly className?: string } & Omit<
  TextareaHTMLAttributes<HTMLTextAreaElement>,
  'className'
>) {
  const id = useId();
  return (
    <div className={className}>
      <label htmlFor={id} className={CLASSE_ROTULO}>
        {rotulo}
      </label>
      <textarea id={id} className={`${CLASSE_CAMPO} h-auto min-h-[112px] py-3`} {...props} />
    </div>
  );
}

export interface Opcao<T> {
  readonly valor: T;
  readonly rotulo: string;
}

export function Selecao<T extends string | number>({
  rotulo,
  valor,
  opcoes,
  aoMudar,
  disabled,
  className,
  dica,
}: {
  readonly rotulo: string;
  readonly valor: T;
  readonly opcoes: ReadonlyArray<Opcao<T>>;
  readonly aoMudar: (valor: T) => void;
  readonly disabled?: boolean;
  readonly className?: string;
  readonly dica?: ReactNode;
}) {
  const id = useId();
  return (
    <div className={className}>
      <label htmlFor={id} className={CLASSE_ROTULO}>
        {rotulo}
      </label>
      <div className="relative">
        <select
          id={id}
          value={String(valor)}
          disabled={disabled}
          onChange={(evento) => {
            const escolhida = opcoes.find((opcao) => String(opcao.valor) === evento.target.value);
            if (escolhida) aoMudar(escolhida.valor);
          }}
          className={`${CLASSE_CAMPO} appearance-none pr-10`}
        >
          {opcoes.map((opcao) => (
            <option key={String(opcao.valor)} value={String(opcao.valor)}>
              {opcao.rotulo}
            </option>
          ))}
        </select>
        <ChevronDown
          size={16}
          aria-hidden="true"
          className="text-stone pointer-events-none absolute right-3.5 top-1/2 -translate-y-1/2"
        />
      </div>
      {dica && <p className="text-caption text-stone mt-1.5">{dica}</p>}
    </div>
  );
}

export function Marcador({
  rotulo,
  marcado,
  aoMudar,
  disabled,
  descricao,
}: {
  readonly rotulo: string;
  readonly marcado: boolean;
  readonly aoMudar: (marcado: boolean) => void;
  readonly disabled?: boolean;
  readonly descricao?: string;
}) {
  const id = useId();
  return (
    <label
      htmlFor={id}
      className={`-mx-3 flex items-start gap-3 rounded-xl px-3 py-2.5 transition ${disabled ? 'text-stone cursor-not-allowed' : 'hover:bg-surface-soft cursor-pointer'}`}
    >
      <input
        id={id}
        type="checkbox"
        checked={marcado}
        disabled={disabled}
        onChange={(evento) => aoMudar(evento.target.checked)}
        className="accent-ink mt-0.5 h-[18px] w-[18px] shrink-0 cursor-pointer disabled:cursor-not-allowed"
      />
      <span className="text-body-sm flex-1">
        {rotulo}
        {descricao && <span className="text-caption text-stone mt-0.5 block">{descricao}</span>}
      </span>
    </label>
  );
}

export function Escolha<T extends string>({
  rotulo,
  valor,
  opcoes,
  aoMudar,
}: {
  readonly rotulo: string;
  readonly valor: T;
  readonly opcoes: ReadonlyArray<Opcao<T> & { readonly desabilitada?: boolean }>;
  readonly aoMudar: (valor: T) => void;
}) {
  const nome = useId();
  return (
    <fieldset>
      <legend className={CLASSE_ROTULO}>{rotulo}</legend>
      <div className="bg-surface-soft inline-flex max-w-full flex-wrap gap-1 rounded-3xl p-1">
        {opcoes.map((opcao) => (
          <label
            key={opcao.valor}
            className={`text-button-sm has-[:focus-visible]:ring-primary/15 flex h-9 items-center rounded-full px-4 transition has-[:focus-visible]:ring-4 ${valor === opcao.valor ? 'bg-canvas-light text-ink ring-hairline-light ring-1' : 'text-mute hover:text-ink'} ${opcao.desabilitada ? 'cursor-not-allowed opacity-50' : 'cursor-pointer'}`}
          >
            <input
              type="radio"
              className="sr-only"
              name={nome}
              checked={valor === opcao.valor}
              disabled={opcao.desabilitada}
              onChange={() => aoMudar(opcao.valor)}
            />
            {opcao.rotulo}
          </label>
        ))}
      </div>
    </fieldset>
  );
}

export function CampoSegredo({
  rotulo,
  gravado,
  valor,
  aoMudar,
  className,
}: {
  readonly rotulo: string;
  readonly gravado: boolean;
  readonly valor: string;
  readonly aoMudar: (valor: string) => void;
  readonly className?: string;
}) {
  const [visivel, setVisivel] = useState(false);
  return (
    <Campo
      rotulo={rotulo}
      className={className}
      type={visivel ? 'text' : 'password'}
      autoComplete="new-password"
      value={valor}
      onChange={(evento) => aoMudar(evento.target.value)}
      placeholder={gravado ? '•••••••• guardado' : ''}
      dica={gravado && valor === '' ? 'Guardado no cofre. Deixe em branco para manter.' : undefined}
      acessorio={
        <button
          type="button"
          onClick={() => setVisivel((atual) => !atual)}
          aria-label={visivel ? `Ocultar ${rotulo}` : `Mostrar ${rotulo}`}
          className={BOTAO_ICONE}
        >
          {visivel ? <EyeOff size={17} /> : <Eye size={17} />}
        </button>
      }
    />
  );
}

export function Abas({
  idBase,
  abas,
  ativa,
  aoMudar,
}: {
  readonly idBase: string;
  readonly abas: readonly Aba[];
  readonly ativa: string;
  readonly aoMudar: (aba: string) => void;
}) {
  const mover = (evento: KeyboardEvent<HTMLButtonElement>, indice: number) => {
    const passo = { ArrowRight: 1, ArrowLeft: -1 }[evento.key];
    if (!passo) return;
    evento.preventDefault();
    const proxima = abas[(indice + passo + abas.length) % abas.length];
    if (!proxima) return;
    aoMudar(proxima.id);
    document.getElementById(`${idBase}-aba-${proxima.id}`)?.focus();
  };
  return (
    <div role="tablist" className="border-hairline-light flex gap-1 overflow-x-auto border-b">
      {abas.map((aba, indice) => (
        <button
          key={aba.id}
          id={`${idBase}-aba-${aba.id}`}
          type="button"
          role="tab"
          aria-selected={aba.id === ativa}
          aria-controls={`${idBase}-painel`}
          tabIndex={aba.id === ativa ? 0 : -1}
          onClick={() => aoMudar(aba.id)}
          onKeyDown={(evento) => mover(evento, indice)}
          className={`text-button-sm -mb-px h-11 shrink-0 whitespace-nowrap border-b-2 px-3 transition ${aba.id === ativa ? 'border-ink text-ink' : 'text-mute hover:text-ink border-transparent'}`}
        >
          {aba.rotulo}
        </button>
      ))}
    </div>
  );
}

export function Grupo({
  titulo,
  descricao,
  acao,
  children,
}: {
  readonly titulo: string;
  readonly descricao?: string;
  readonly acao?: ReactNode;
  readonly children: ReactNode;
}) {
  return (
    <section className="mt-10 first:mt-0">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h3 className="text-body-md text-ink font-semibold">{titulo}</h3>
          {descricao && <p className="text-body-sm text-mute mt-0.5">{descricao}</p>}
        </div>
        {acao}
      </div>
      <div className="mt-4">{children}</div>
    </section>
  );
}

export function Nota({
  icone,
  children,
}: {
  readonly icone?: ReactNode;
  readonly children: ReactNode;
}) {
  return (
    <div className="bg-surface-soft text-body-sm text-charcoal flex items-start gap-3 rounded-xl px-4 py-3">
      {icone && <span className="text-mute mt-0.5 shrink-0">{icone}</span>}
      <div className="flex-1">{children}</div>
    </div>
  );
}
