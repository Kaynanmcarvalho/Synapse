import { Status, Text, type TomDeStatus } from '@synapse/sdl';
import type { Customer } from '@synapse/types';
import { CircleAlert, CircleCheck, LoaderCircle, Save, UserPlus } from 'lucide-react';
import { formatarDocumento, formatarMoeda } from './formato';

/** Cabeçalho e rodapé do conteúdo do cadastro — não da janela: a mecânica de
 *  fechar/arrastar/maximizar agora é do `Janela` (Fase 6.2), então este
 *  cabeçalho só mostra quem é o cliente (monograma, situação, limite). O
 *  fechar mora só no X da barra de título e no "(Esc) Sair" do rodapé — dois
 *  lugares em vez de três.
 *
 *  As abas migraram para `Abas`/`PainelDeAba`
 *  (`components/formulario/Formulario.tsx`, Fase 6.1) — sublinhado cobalto em
 *  vez da pílula própria que só esta janela e `JanelaDeCadastro` tinham. */

const BOTAO_CLARO =
  'bg-surface-soft text-button-sm text-ink inline-flex h-10 items-center gap-2 rounded-full px-4 transition hover:bg-[#ececee] disabled:cursor-not-allowed disabled:opacity-40';
const BOTAO_ESCURO =
  'bg-canvas-dark text-button-sm hover:bg-charcoal shadow-cartao inline-flex h-10 items-center gap-2 rounded-full px-5 text-white transition disabled:cursor-not-allowed disabled:opacity-40';

const SITUACAO: Readonly<Record<string, readonly [string, TomDeStatus]>> = {
  REGULAR: ['Liberado para venda', 'ok'],
  BLOCKED: ['Bloqueado para venda', 'perigo'],
  OVERDUE: ['Inadimplente', 'atencao'],
};

const iniciais = (nome: string) =>
  nome
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((parte) => parte.charAt(0).toUpperCase())
    .join('');

function Monograma({ cliente }: { readonly cliente: Customer | null }) {
  if (!cliente) {
    return (
      <span
        aria-hidden="true"
        className="bg-brand-50 text-primary flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl"
      >
        <UserPlus size={20} />
      </span>
    );
  }
  return (
    <span
      aria-hidden="true"
      className="bg-primary font-display text-body-md shadow-cartao flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl font-semibold text-white"
    >
      {iniciais(cliente.name) || '?'}
    </span>
  );
}

/** Documento, cidade e o que a análise de crédito e o PDV leem deste cadastro. */
function Resumo({ cliente }: { readonly cliente: Customer }) {
  const [situacao, tom] = SITUACAO[cliente.financialStatus] ?? ['Liberado para venda', 'ok'];
  return (
    <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
      <span className="text-caption text-stone mr-1 tabular-nums">
        {formatarDocumento(cliente.taxId)} · {cliente.address.city}/{cliente.address.state}
      </span>
      <Status tone={tom} variant="chip">
        {situacao}
      </Status>
      <Status tone="neutro" variant="chip">
        {cliente.active === false ? 'Inativo' : 'Ativo'}
      </Status>
      <Status tone="neutro" variant="chip">
        Limite {formatarMoeda(cliente.creditLimit)}
      </Status>
    </div>
  );
}

export function Cabecalho({ cliente }: { readonly cliente: Customer | null }) {
  const titulo = cliente
    ? `${cliente.codigo ? `${cliente.codigo} · ` : ''}${cliente.name}`
    : 'Novo cliente';
  return (
    <header className="border-hairline-light flex items-start gap-4 border-b bg-white px-6 py-5">
      <Monograma cliente={cliente} />
      <div className="min-w-0">
        <p className="text-caption text-stone font-semibold uppercase tracking-[0.12em]">
          Cadastro de clientes
        </p>
        <h2 className="font-display text-heading-sm text-ink truncate tracking-[-0.2px]">
          {titulo}
        </h2>
        {cliente ? (
          <Resumo cliente={cliente} />
        ) : (
          <p className="text-caption text-stone mt-0.5">
            O código é gerado quando o cadastro é salvo.
          </p>
        )}
      </div>
    </header>
  );
}

function Mensagem({
  erro,
  alterado,
  salvo,
}: {
  readonly erro: string | null;
  readonly alterado: boolean;
  readonly salvo: boolean;
}) {
  if (erro) {
    return (
      <Text variant="corpo" tone="perigo" role="alert" className="flex min-w-0 items-center gap-2">
        <CircleAlert size={15} aria-hidden="true" className="shrink-0" />
        <span className="truncate">{erro}</span>
      </Text>
    );
  }
  if (alterado) {
    return (
      <Text variant="corpo" tone="atencao" className="flex items-center gap-2">
        <span
          aria-hidden="true"
          className="bg-status-atencao-indicador h-2 w-2 shrink-0 rounded-full"
        />
        Alterações não salvas.
      </Text>
    );
  }
  if (salvo) {
    return (
      <Text variant="corpo" tone="ok" className="flex items-center gap-2">
        <CircleCheck size={15} aria-hidden="true" className="shrink-0" />
        Cadastro salvo.
      </Text>
    );
  }
  return <span className="text-stone">Preencha os dados e salve para gerar o código.</span>;
}

export function Rodape({
  erro,
  alterado,
  salvo,
  salvando,
  carregando,
  aoLimpar,
  aoSair,
  aoSalvar,
}: {
  readonly erro: string | null;
  readonly alterado: boolean;
  readonly salvo: boolean;
  readonly salvando: boolean;
  readonly carregando: boolean;
  readonly aoLimpar: () => void;
  readonly aoSair: () => void;
  readonly aoSalvar: () => void;
}) {
  return (
    <footer className="border-hairline-light relative z-10 flex items-center justify-between gap-3 border-t bg-white px-6 py-3.5 shadow-[0_-12px_24px_-20px_rgba(25,28,31,0.35)]">
      <div className="text-body-sm min-w-0" role="status">
        <Mensagem erro={erro} alterado={alterado} salvo={salvo} />
      </div>
      <div className="flex shrink-0 items-center gap-2">
        <button
          type="button"
          onClick={aoLimpar}
          disabled={!alterado || salvando}
          className={BOTAO_CLARO}
        >
          (F3) Limpar
        </button>
        <button type="button" onClick={aoSair} className={BOTAO_CLARO}>
          (Esc) Sair
        </button>
        <button
          type="button"
          onClick={aoSalvar}
          disabled={salvando || carregando}
          className={BOTAO_ESCURO}
        >
          {salvando ? (
            <LoaderCircle
              size={15}
              aria-hidden="true"
              className="animate-spin motion-reduce:animate-none"
            />
          ) : (
            <Save size={15} aria-hidden="true" />
          )}
          {salvando ? 'Salvando…' : '(F2) Salvar'}
        </button>
      </div>
    </footer>
  );
}
