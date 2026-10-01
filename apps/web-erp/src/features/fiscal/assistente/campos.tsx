import { Field, IconButton, Input, TAMANHO_DE_ICONE, Text } from '@synapse/sdl';
import { Eye, EyeOff, Info } from 'lucide-react';
import { type ReactNode, useId, useState } from 'react';
import type { Opcao } from './opcoes';

/** O que sobrou do kit próprio do assistente fiscal (Fase 8): só as peças que
 *  têm papel de domínio e que o SDL ainda não cobre. Campo, seleção, área de
 *  texto, botões, abas e seções agora são `Field`/`Input`/`Select`/`Button`/
 *  `IconButton` do SDL e `Secao`/`Abas`/`AreaDeTexto` do Form Grammar. */

/** As `<option>` de um `Select` do SDL a partir de uma lista de opções. */
export function OpcoesDoSelect<T extends string | number>({
  opcoes,
}: {
  readonly opcoes: ReadonlyArray<Opcao<T>>;
}) {
  return (
    <>
      {opcoes.map((opcao) => (
        <option key={String(opcao.valor)} value={String(opcao.valor)}>
          {opcao.rotulo}
        </option>
      ))}
    </>
  );
}

/** Caixa de marcar com descrição. Não há checkbox no SDL: a linha inteira é o
 *  alvo de clique, o tom vem dos tokens e o estado desabilitado fica legível. */
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
      className={`rounded-controle -mx-2 flex items-start gap-2.5 px-2 py-1.5 transition-colors ${disabled ? 'text-ink-desabilitado cursor-not-allowed' : 'hover:bg-surface-suave cursor-pointer'}`}
    >
      <input
        id={id}
        type="checkbox"
        checked={marcado}
        disabled={disabled}
        onChange={(evento) => aoMudar(evento.target.checked)}
        className="accent-primary mt-0.5 h-4 w-4 shrink-0 cursor-pointer disabled:cursor-not-allowed"
      />
      <span className="text-body-sm flex-1">
        {rotulo}
        {descricao && (
          <Text variant="legenda" className="mt-0.5 block">
            {descricao}
          </Text>
        )}
      </span>
    </label>
  );
}

/** Escolha exclusiva entre poucas opções (radio). A opção marcada se distingue
 *  por plano, borda e peso — não só pela cor. */
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
      <legend className="text-caption text-ink-medio mb-1.5 block font-medium">{rotulo}</legend>
      <div className="border-line-fina bg-surface-afundada rounded-controle inline-flex max-w-full flex-wrap gap-0.5 border p-0.5">
        {opcoes.map((opcao) => {
          const marcada = valor === opcao.valor;
          return (
            <label
              key={opcao.valor}
              className={`text-button-sm has-[:focus-visible]:ring-primary/40 rounded-minimo flex h-8 items-center px-3 transition-colors has-[:focus-visible]:ring-2 ${marcada ? 'bg-surface-painel text-ink ring-line-fina font-semibold ring-1' : 'text-ink-medio hover:text-ink'} ${opcao.desabilitada ? 'text-ink-desabilitado cursor-not-allowed' : 'cursor-pointer'}`}
            >
              <input
                type="radio"
                className="sr-only"
                name={nome}
                checked={marcada}
                disabled={opcao.desabilitada}
                onChange={() => aoMudar(opcao.valor)}
              />
              {opcao.rotulo}
            </label>
          );
        })}
      </div>
    </fieldset>
  );
}

/** Segredo do cofre: vazio mantém o que está guardado. Essa regra é o que
 *  justifica o componente — o resto é `Field` + `Input` + `IconButton`. */
export function CampoSegredo({
  rotulo,
  gravado,
  valor,
  aoMudar,
  className,
  erro,
  campo,
}: {
  readonly rotulo: string;
  readonly gravado: boolean;
  readonly valor: string;
  readonly aoMudar: (valor: string) => void;
  readonly className?: string;
  readonly erro?: string | null;
  /** `data-campo` para a faixa de pendências achar o campo. */
  readonly campo?: string;
}) {
  const [visivel, setVisivel] = useState(false);
  return (
    <Field
      label={rotulo}
      className={className}
      error={erro ?? null}
      hint={gravado && valor === '' ? 'Guardado no cofre. Deixe em branco para manter.' : undefined}
      data-campo={campo}
    >
      <div className="flex items-center gap-1">
        <Input
          type={visivel ? 'text' : 'password'}
          autoComplete="new-password"
          value={valor}
          placeholder={gravado ? '•••••••• guardado' : ''}
          onChange={(evento) => aoMudar(evento.target.value)}
        />
        <IconButton
          label={visivel ? `Ocultar ${rotulo}` : `Mostrar ${rotulo}`}
          onClick={() => setVisivel((atual) => !atual)}
        >
          {visivel ? (
            <EyeOff size={TAMANHO_DE_ICONE.padrao} aria-hidden="true" />
          ) : (
            <Eye size={TAMANHO_DE_ICONE.padrao} aria-hidden="true" />
          )}
        </IconButton>
      </div>
    </Field>
  );
}

/** Observação de contexto: linha à esquerda, texto de apoio, sem caixa. */
export function Nota({
  children,
  icone,
}: {
  readonly children: ReactNode;
  readonly icone?: ReactNode;
}) {
  return (
    <div className="border-line-media text-body-sm text-ink-apoio flex max-w-3xl items-start gap-2 border-l-2 py-0.5 pl-3">
      <span className="mt-0.5 shrink-0" aria-hidden="true">
        {icone ?? <Info size={TAMANHO_DE_ICONE.compacta} />}
      </span>
      <span>{children}</span>
    </div>
  );
}
