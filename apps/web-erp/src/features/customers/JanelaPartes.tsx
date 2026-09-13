import type { Customer } from '@synapse/types';
import { CircleAlert, CircleCheck, LoaderCircle, Save, UserPlus, X } from 'lucide-react';
import type { ReactNode } from 'react';
import { formatarDocumento, formatarMoeda } from './formato';
import { ABAS, type Aba } from './janela';

/** Cabeçalho, abas e rodapé da janela do cadastro.
 *
 *  A hierarquia vai de cima para baixo: quem é o cliente (monograma, nome e a
 *  situação que o resto do sistema lê), onde se está (abas num trilho, a aberta
 *  em relevo) e o que falta fazer (rodapé que flutua sobre a rolagem). */

const BOTAO_CLARO =
  'bg-surface-soft text-button-sm text-ink inline-flex h-10 items-center gap-2 rounded-full px-4 transition hover:bg-[#ececee] disabled:cursor-not-allowed disabled:opacity-40';
const BOTAO_ESCURO =
  'bg-canvas-dark text-button-sm hover:bg-charcoal shadow-cartao inline-flex h-10 items-center gap-2 rounded-full px-5 text-white transition disabled:cursor-not-allowed disabled:opacity-40';

type Tom = 'neutro' | 'positivo' | 'alerta' | 'perigo';

const TOM: Record<Tom, string> = {
  neutro: 'bg-surface-soft text-charcoal',
  positivo: 'bg-[#e6f6f1] text-[#00664d]',
  alerta: 'bg-[#fff3e0] text-[#8a4b00]',
  perigo: 'bg-[#fdeced] text-[#b3242f]',
};

const SITUACAO: Readonly<Record<string, readonly [string, Tom]>> = {
  REGULAR: ['Liberado para venda', 'positivo'],
  BLOCKED: ['Bloqueado para venda', 'perigo'],
  OVERDUE: ['Inadimplente', 'alerta'],
};

const iniciais = (nome: string) =>
  nome
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((parte) => parte.charAt(0).toUpperCase())
    .join('');

function Selo({ tom, children }: { readonly tom: Tom; readonly children: ReactNode }) {
  return (
    <span
      className={`text-caption inline-flex h-6 items-center rounded-full px-2.5 font-medium ${TOM[tom]}`}
    >
      {children}
    </span>
  );
}

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
  const [situacao, tom] = SITUACAO[cliente.financialStatus] ?? ['Liberado para venda', 'positivo'];
  return (
    <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
      <span className="text-caption text-stone mr-1 tabular-nums">
        {formatarDocumento(cliente.taxId)} · {cliente.address.city}/{cliente.address.state}
      </span>
      <Selo tom={tom}>{situacao}</Selo>
      <Selo tom="neutro">{cliente.active === false ? 'Inativo' : 'Ativo'}</Selo>
      <Selo tom="neutro">Limite {formatarMoeda(cliente.creditLimit)}</Selo>
    </div>
  );
}

export function Cabecalho({
  cliente,
  aoSair,
}: {
  readonly cliente: Customer | null;
  readonly aoSair: () => void;
}) {
  const titulo = cliente
    ? `${cliente.codigo ? `${cliente.codigo} · ` : ''}${cliente.name}`
    : 'Novo cliente';
  return (
    <header className="border-hairline-light flex items-start justify-between gap-4 border-b bg-white px-6 py-5">
      <div className="flex min-w-0 items-center gap-4">
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
      </div>
      <button type="button" onClick={aoSair} className={BOTAO_CLARO}>
        <X size={15} aria-hidden="true" /> Fechar
      </button>
    </header>
  );
}

export function Abas({
  aba,
  aoTrocar,
  comErro,
}: {
  readonly aba: Aba;
  readonly aoTrocar: (aba: Aba) => void;
  readonly comErro: readonly Aba[];
}) {
  return (
    <div
      role="tablist"
      aria-label="Cadastro de clientes"
      className="bg-surface-soft inline-flex max-w-full gap-0.5 overflow-x-auto rounded-full p-1"
    >
      {ABAS.map(([id, rotulo]) => (
        <button
          key={id}
          type="button"
          role="tab"
          aria-selected={aba === id}
          onClick={() => aoTrocar(id)}
          className={`text-button-sm inline-flex h-9 shrink-0 items-center gap-1.5 rounded-full px-4 transition duration-200 ${
            aba === id
              ? 'text-ink bg-white shadow-[0_1px_2px_rgba(25,28,31,0.08),0_6px_16px_-10px_rgba(25,28,31,0.4)]'
              : 'text-mute hover:text-ink'
          }`}
        >
          {rotulo}
          {comErro.includes(id) ? (
            <span
              aria-label="Há campo para corrigir nesta aba"
              className="h-1.5 w-1.5 rounded-full bg-[#b3242f]"
            />
          ) : null}
        </button>
      ))}
    </div>
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
      <span className="flex min-w-0 items-center gap-2 text-[#b3242f]">
        <CircleAlert size={15} aria-hidden="true" className="shrink-0" />
        <span className="truncate">{erro}</span>
      </span>
    );
  }
  if (alterado) {
    return (
      <span className="flex items-center gap-2 text-[#8a4b00]">
        <span aria-hidden="true" className="bg-accent-warning h-2 w-2 shrink-0 rounded-full" />
        Alterações não salvas.
      </span>
    );
  }
  if (salvo) {
    return (
      <span className="flex items-center gap-2 text-[#00664d]">
        <CircleCheck size={15} aria-hidden="true" className="shrink-0" />
        Cadastro salvo.
      </span>
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
