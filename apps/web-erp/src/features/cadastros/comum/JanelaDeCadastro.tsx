/* eslint-disable max-lines-per-function */
import { Modal } from '@synapse/ui';
import { CircleAlert, CircleCheck, LoaderCircle, Save, X } from 'lucide-react';
import { useCallback, type ReactNode } from 'react';
import { useAtalhosDoCadastro } from '../../customers/useAtalhosDoCadastro';
import { BOTAO_CLARO, BOTAO_ESCURO } from './estilos';

/** A janela dos cadastros do Syndata (funcionários, fornecedores): cabeçalho
 *  com quem é, abas num trilho, miolo que rola sobre fundo cinza e rodapé com
 *  (F2) Salvar, (F3) Limpar e (Esc) Sair — os atalhos que a mão já conhece.
 *  Sair com alteração pendente pergunta antes. */

export interface AbaDaJanela<A extends string> {
  readonly id: A;
  readonly rotulo: string;
}

export interface PropsDaJanela<A extends string> {
  readonly rotuloDaTela: string;
  readonly titulo: string;
  readonly subtitulo?: ReactNode;
  readonly avatar: ReactNode;
  readonly abas: readonly AbaDaJanela<A>[];
  readonly aba: A;
  readonly aoTrocarAba: (aba: A) => void;
  readonly abasComErro: readonly A[];
  readonly carregando: boolean;
  readonly erroDeCarga: string | null;
  readonly erro: string | null;
  readonly alterado: boolean;
  readonly salvo: boolean;
  readonly salvando: boolean;
  readonly dicaDeNovo: string;
  readonly aoSalvar: () => void;
  readonly aoLimpar: () => void;
  readonly aoSair: () => void;
  readonly acoesExtras?: ReactNode;
  readonly children: ReactNode;
}

function Mensagem({
  erro,
  alterado,
  salvo,
  dicaDeNovo,
}: {
  readonly erro: string | null;
  readonly alterado: boolean;
  readonly salvo: boolean;
  readonly dicaDeNovo: string;
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
  return <span className="text-stone">{dicaDeNovo}</span>;
}

export function JanelaDeCadastro<A extends string>(props: PropsDaJanela<A>) {
  const { alterado, aoSair, aoSalvar, aoLimpar } = props;

  const sair = useCallback(() => {
    if (alterado && !window.confirm('Sair sem salvar? O que foi digitado se perde.')) return;
    aoSair();
  }, [alterado, aoSair]);

  useAtalhosDoCadastro(aoSalvar, aoLimpar);

  return (
    <Modal
      onClose={sair}
      label={props.rotuloDaTela}
      size="full"
      bare
      closeOnBackdrop={false}
      className="sm:h-[90vh]"
    >
      <header className="border-hairline-light flex items-start justify-between gap-4 border-b bg-white px-6 py-4">
        <div className="flex min-w-0 items-center gap-4">
          {props.avatar}
          <div className="min-w-0">
            <p className="text-caption text-stone font-semibold uppercase tracking-[0.12em]">
              {props.rotuloDaTela}
            </p>
            <h2 className="font-display text-heading-sm text-ink truncate tracking-[-0.2px]">
              {props.titulo}
            </h2>
            {props.subtitulo}
          </div>
        </div>
        <button type="button" onClick={sair} className={BOTAO_CLARO}>
          <X size={15} aria-hidden="true" /> Fechar
        </button>
      </header>

      <div className="border-hairline-light border-b bg-white px-6 py-3">
        <div
          role="tablist"
          aria-label={props.rotuloDaTela}
          className="bg-surface-soft inline-flex max-w-full gap-0.5 overflow-x-auto rounded-full p-1"
        >
          {props.abas.map(({ id, rotulo }) => (
            <button
              key={id}
              type="button"
              role="tab"
              aria-selected={props.aba === id}
              onClick={() => props.aoTrocarAba(id)}
              className={`text-button-sm inline-flex h-9 shrink-0 items-center gap-1.5 rounded-full px-4 transition duration-200 ${
                props.aba === id
                  ? 'text-ink bg-white shadow-[0_1px_2px_rgba(25,28,31,0.08),0_6px_16px_-10px_rgba(25,28,31,0.4)]'
                  : 'text-mute hover:text-ink'
              }`}
            >
              {rotulo}
              {props.abasComErro.includes(id) ? (
                <span
                  aria-label="Há campo para corrigir nesta aba"
                  className="h-1.5 w-1.5 rounded-full bg-[#b3242f]"
                />
              ) : null}
            </button>
          ))}
        </div>
      </div>

      <div className="bg-surface-soft min-h-0 flex-1 overflow-y-auto px-6 py-5">
        {props.carregando ? (
          <p
            role="status"
            className="text-body-sm text-stone flex items-center justify-center gap-2 py-16"
          >
            <LoaderCircle
              size={16}
              aria-hidden="true"
              className="animate-spin motion-reduce:animate-none"
            />
            Carregando cadastro…
          </p>
        ) : props.erroDeCarga ? (
          <p className="text-body-sm py-16 text-center text-[#b3242f]">{props.erroDeCarga}</p>
        ) : (
          <div key={props.aba} className="animate-revelar motion-reduce:animate-none">
            {props.children}
          </div>
        )}
      </div>

      <footer className="border-hairline-light relative z-10 flex flex-wrap items-center justify-between gap-3 border-t bg-white px-6 py-3.5 shadow-[0_-12px_24px_-20px_rgba(25,28,31,0.35)]">
        <div className="text-body-sm min-w-0" role="status">
          <Mensagem
            erro={props.erro}
            alterado={alterado}
            salvo={props.salvo}
            dicaDeNovo={props.dicaDeNovo}
          />
        </div>
        <div className="flex shrink-0 flex-wrap items-center gap-2">
          {props.acoesExtras}
          <button
            type="button"
            onClick={aoLimpar}
            disabled={!alterado || props.salvando}
            className={BOTAO_CLARO}
          >
            (F3) Limpar
          </button>
          <button type="button" onClick={sair} className={BOTAO_CLARO}>
            (Esc) Sair
          </button>
          <button
            type="button"
            onClick={aoSalvar}
            disabled={props.salvando || props.carregando}
            className={BOTAO_ESCURO}
          >
            {props.salvando ? (
              <LoaderCircle
                size={15}
                aria-hidden="true"
                className="animate-spin motion-reduce:animate-none"
              />
            ) : (
              <Save size={15} aria-hidden="true" />
            )}
            {props.salvando ? 'Salvando…' : '(F2) Salvar'}
          </button>
        </div>
      </footer>
    </Modal>
  );
}
