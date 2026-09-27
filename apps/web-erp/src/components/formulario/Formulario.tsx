import { Text, useControle } from '@synapse/sdl';
import type { HTMLAttributes, ReactNode, TextareaHTMLAttributes } from 'react';

/** Form Grammar v1 — CANDIDATE (Fase 6).
 *
 *  Não é um `<Form />` universal. São as quatro peças que Purchasing e Boletos
 *  precisaram de verdade, em cima do que o SDL já tem (`Field`, `Input`,
 *  `NumberInput`, `Select`, `Button`). Ficam no app, como `CelulaDeDinheiro`,
 *  até uma terceira tela confirmar a forma — aí sobem para o SDL.
 *
 *  Os princípios, e não as peças, são o que vale copiar:
 *  - seção é título + linha, nunca caixa arredondada dentro de caixa;
 *  - largura do campo vem do DADO (código curto, nome longo), não de uma
 *    grade de 12 colunas;
 *  - a ação mora no fim da seção que ela conclui, na largura do próprio texto;
 *  - o erro de envio fica ao lado da ação que falhou, uma vez só. */

/** Seção de formulário: título, descrição opcional e uma ação à direita.
 *  Separada da anterior por hairline e respiro — `Surface`, não card. */
export function Secao({
  titulo,
  descricao,
  acao,
  children,
  className,
  ...resto
}: {
  readonly titulo: string;
  readonly descricao?: ReactNode;
  readonly acao?: ReactNode;
  readonly children: ReactNode;
} & Omit<HTMLAttributes<HTMLElement>, 'title'>) {
  return (
    <section
      className={`border-line-fina border-t pt-5 first:border-t-0 first:pt-0 ${className ?? ''}`}
      {...resto}
    >
      <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <Text variant="tituloCartao" as="h3">
            {titulo}
          </Text>
          {descricao ? (
            <Text variant="corpoSecundario" className="mt-0.5">
              {descricao}
            </Text>
          ) : null}
        </div>
        {acao}
      </div>
      {children}
    </section>
  );
}

/** Campos lado a lado que pertencem ao mesmo assunto. */
export function LinhaDeCampos({ children }: { readonly children: ReactNode }) {
  return <div className="flex flex-wrap items-start gap-x-4 gap-y-3">{children}</div>;
}

/** Fim da seção: mensagem (erro de envio ou espera) à esquerda, ações à
 *  direita. Um lugar só para o erro — não input vermelho + caixa + toast. */
export function BarraDeAcoes({
  mensagem,
  tomDaMensagem = 'perigo',
  children,
}: {
  readonly mensagem?: string | null;
  readonly tomDaMensagem?: 'perigo' | 'atencao' | 'apoio';
  readonly children: ReactNode;
}) {
  return (
    <div className="mt-5 flex flex-wrap items-center justify-end gap-x-4 gap-y-2">
      {mensagem ? (
        <Text
          variant="corpo"
          tone={tomDaMensagem}
          role={tomDaMensagem === 'perigo' ? 'alert' : 'status'}
          className="mr-auto min-w-0"
        >
          {mensagem}
        </Text>
      ) : null}
      <div className="flex flex-wrap items-center gap-2">{children}</div>
    </div>
  );
}

/** Dado consultivo: rótulo + valor em TEXTO, nunca um input desabilitado. Fica
 *  legível (tom padrão, não apagado) e selecionável para copiar. `disabled` é
 *  para o que poderia ser editado e agora não pode; isto aqui nunca se edita. */
export function ValoresDeLeitura({
  itens,
}: {
  readonly itens: ReadonlyArray<{
    readonly rotulo: string;
    readonly valor: ReactNode;
    readonly dado?: boolean;
  }>;
}) {
  return (
    <dl className="flex flex-wrap gap-x-8 gap-y-2">
      {itens.map((item) => (
        <div key={item.rotulo} className="min-w-0">
          <dt>
            <Text variant="rotulo">{item.rotulo}</Text>
          </dt>
          <dd className="mt-0.5 select-text">
            <Text variant={item.dado ? 'dado' : 'corpo'} as="span">
              {item.valor}
            </Text>
          </dd>
        </div>
      ))}
    </dl>
  );
}

/** O SDL ainda não tem `Textarea`. Esta é a mesma geometria do `Input`
 *  (linha fina, superfície afundada, foco cobalto) e herda id/aria do `Field`
 *  pelo mesmo `useControle` — candidata a primitive quando outra tela pedir. */
export function AreaDeTexto({ className, ...resto }: TextareaHTMLAttributes<HTMLTextAreaElement>) {
  const controle = useControle({
    id: resto.id,
    disabled: resto.disabled,
    describedBy: resto['aria-describedby'],
  });
  return (
    <textarea
      {...resto}
      id={controle.id}
      disabled={controle.desabilitado}
      {...controle.aria}
      className={`rounded-controle border-line-fina bg-surface-afundada text-body-sm text-ink placeholder:text-ink-sutil hover:border-faint focus:border-primary focus:bg-surface-painel focus:ring-primary/30 duration-rapido w-full border px-3 py-2 outline-none transition-colors focus:ring-2 ${className ?? ''}`}
    />
  );
}

/** Abas de trabalho: a mesma linguagem das abas do assistente fiscal (a
 *  única do sistema com setas ←/→ e `aria-controls`), trocada para tokens do
 *  SDL — sublinhado curto na aba ativa, sem pílula preta. */
export function Abas<TId extends string>({
  idBase,
  abas,
  ativa,
  aoMudar,
  rotulo,
  comErro,
}: {
  readonly idBase: string;
  readonly abas: ReadonlyArray<{ readonly id: TId; readonly rotulo: string }>;
  readonly ativa: TId;
  readonly aoMudar: (aba: TId) => void;
  readonly rotulo: string;
  /** Abas com campo para corrigir — o ponto de aviso ao lado do rótulo.
   *  Segundo consumidor real (JanelaDoCliente, Fase 6.1): sem isto a aba
   *  perderia a única pista de "tem erro aqui" ao trocar de pílula para
   *  sublinhado. */
  readonly comErro?: ReadonlySet<TId> | readonly TId[];
}) {
  const temErro = (id: TId): boolean => {
    if (!comErro) return false;
    if (comErro instanceof Set) return comErro.has(id);
    return (comErro as readonly TId[]).includes(id);
  };
  const mover = (evento: React.KeyboardEvent<HTMLButtonElement>, indice: number) => {
    const passo = ({ ArrowRight: 1, ArrowLeft: -1 } as Record<string, number>)[evento.key];
    if (!passo) return;
    evento.preventDefault();
    const proxima = abas[(indice + passo + abas.length) % abas.length];
    if (!proxima) return;
    aoMudar(proxima.id);
    document.getElementById(`${idBase}-aba-${proxima.id}`)?.focus();
  };
  return (
    <div
      role="tablist"
      aria-label={rotulo}
      className="border-line-fina flex gap-4 overflow-x-auto border-b"
    >
      {abas.map((aba, indice) => {
        const selecionada = aba.id === ativa;
        return (
          <button
            key={aba.id}
            id={`${idBase}-aba-${aba.id}`}
            type="button"
            role="tab"
            aria-selected={selecionada}
            aria-controls={`${idBase}-painel`}
            tabIndex={selecionada ? 0 : -1}
            onClick={() => aoMudar(aba.id)}
            onKeyDown={(evento) => mover(evento, indice)}
            className={`text-button-sm focus-visible:ring-primary/40 rounded-minimo -mb-px inline-flex h-9 items-center gap-1.5 whitespace-nowrap border-b-2 outline-none transition-colors focus-visible:ring-2 ${
              selecionada
                ? 'border-primary text-ink'
                : 'text-ink-medio hover:text-ink border-transparent'
            }`}
          >
            {aba.rotulo}
            {temErro(aba.id) ? (
              <span
                aria-label="Há campo para corrigir nesta aba"
                className="bg-status-perigo h-1.5 w-1.5 shrink-0 rounded-full"
              />
            ) : null}
          </button>
        );
      })}
    </div>
  );
}

/** Painel ligado às `Abas` (mesmo `idBase`). */
export function PainelDeAba({
  idBase,
  ativa,
  children,
}: {
  readonly idBase: string;
  readonly ativa: string;
  readonly children: ReactNode;
}) {
  return (
    <div
      id={`${idBase}-painel`}
      role="tabpanel"
      aria-labelledby={`${idBase}-aba-${ativa}`}
      className="pt-4"
    >
      {children}
    </div>
  );
}
