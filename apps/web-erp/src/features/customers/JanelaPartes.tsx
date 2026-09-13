import type { Customer } from '@synapse/types';
import { formatarDocumento } from './formato';
import { ABAS, type Aba } from './janela';

/** Cabeçalho, abas e rodapé da janela do cadastro. */

const BOTAO_CLARO =
  'bg-surface-soft text-button-sm text-ink inline-flex h-9 items-center gap-2 rounded-full px-4 transition hover:bg-[#ececee] disabled:cursor-not-allowed disabled:opacity-40';
const BOTAO_ESCURO =
  'bg-canvas-dark text-button-sm hover:bg-charcoal inline-flex h-9 items-center gap-2 rounded-full px-4 text-white transition disabled:cursor-not-allowed disabled:opacity-40';

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
    <header className="border-hairline-light flex items-start justify-between gap-4 border-b px-5 py-4">
      <div className="min-w-0">
        <p className="text-caption text-stone font-semibold uppercase tracking-[0.12em]">
          Cadastro de clientes
        </p>
        <h2 className="font-display text-heading-sm text-ink mt-0.5 truncate">{titulo}</h2>
        <p className="text-caption text-stone mt-0.5">
          {cliente
            ? `${formatarDocumento(cliente.taxId)} · ${cliente.address.city}/${cliente.address.state}`
            : 'O código é gerado quando o cadastro é salvo.'}
        </p>
      </div>
      <button type="button" onClick={aoSair} className={BOTAO_CLARO}>
        Fechar
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
    <div role="tablist" aria-label="Cadastro de clientes" className="flex gap-1 overflow-x-auto">
      {ABAS.map(([id, rotulo]) => (
        <button
          key={id}
          type="button"
          role="tab"
          aria-selected={aba === id}
          onClick={() => aoTrocar(id)}
          className={`text-button-sm inline-flex h-8 shrink-0 items-center gap-1.5 rounded-full px-3.5 transition ${
            aba === id
              ? 'bg-canvas-dark text-white'
              : 'text-charcoal hover:bg-surface-soft hover:text-ink'
          }`}
        >
          {rotulo}
          {comErro.includes(id) ? (
            <span
              aria-label="Há campo para corrigir nesta aba"
              className={`h-1.5 w-1.5 rounded-full ${aba === id ? 'bg-white' : 'bg-[#b3242f]'}`}
            />
          ) : null}
        </button>
      ))}
    </div>
  );
}

const mensagemDoRodape = (erro: string | null, alterado: boolean, salvo: boolean) => {
  if (erro) return <span className="text-[#b3242f]">{erro}</span>;
  if (alterado) return 'Alterações não salvas.';
  return salvo ? 'Cadastro salvo.' : 'Preencha os dados e salve para gerar o código.';
};

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
    <footer className="border-hairline-light flex items-center justify-between gap-3 border-t bg-white px-5 py-3">
      <p className="text-caption text-stone min-w-0 truncate" role="status">
        {mensagemDoRodape(erro, alterado, salvo)}
      </p>
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
          {salvando ? 'Salvando…' : '(F2) Salvar'}
        </button>
      </div>
    </footer>
  );
}
