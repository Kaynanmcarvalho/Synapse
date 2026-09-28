/* eslint-disable max-lines-per-function */
import { CircleAlert, CircleCheck, LoaderCircle, Save } from 'lucide-react';
import { useCallback, type ReactNode } from 'react';
import { Abas, PainelDeAba } from '../../../components/formulario/Formulario';
import { Janela } from '../../../components/janela/Janela';
import { aoAbrir, type Area } from '../../../components/janela/geometria';
import { useAtalhosDoCadastro } from '../../customers/useAtalhosDoCadastro';
import { BOTAO_CLARO, BOTAO_ESCURO } from './estilos';

/** A janela dos cadastros do Syndata (funcionários, fornecedores): cabeçalho
 *  com quem é, abas, miolo que rola sobre fundo cinza e rodapé com (F2)
 *  Salvar, (F3) Limpar e (Esc) Sair — os atalhos que a mão já conhece. Sair
 *  com alteração pendente pergunta antes.
 *
 *  Fase 6.3: converge para a mesma `Janela` real que o Cadastro de Cliente já
 *  usa (Fase 6.2) — arrasto, resize, maximizar, geometria por usuário e
 *  `comFundo` (workspace de edição única, mesmo raciocínio de lá: um clique
 *  perdido no menu por trás não pode navegar e perder o que não foi salvo).
 *  A pílula de abas própria vira `Abas`/`PainelDeAba` (Form Grammar) — mesmo
 *  formato de dado (`{id, rotulo}` e lista de ids com erro) que `Abas` já
 *  espera, sem adaptador. `idDaJanela` é novo: cada cadastro precisa da sua
 *  própria chave de geometria (nunca compartilhada entre Cliente, Funcionário
 *  e Fornecedor). Abertura em 85%×90% da área útil — medida contra o volume
 *  real dos formulários (a aba Principal do Fornecedor, por exemplo, tem mais
 *  linhas que a do Cliente), não copiada às cegas. */

export interface AbaDaJanela<A extends string> {
  readonly id: A;
  readonly rotulo: string;
}

export interface PropsDaJanela<A extends string> {
  /** Chave de geometria própria deste cadastro (`cadastro-funcionario`,
   *  `cadastro-fornecedor`) — nunca a mesma entre cadastros diferentes. */
  readonly idDaJanela: string;
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

const ABERTURA_DO_CADASTRO = (area: Area) => aoAbrir(area, 0.85, 0.9, 'centro');
/** Acima da pilha de janelas do crédito (40 + profundidade) — estes cadastros
 *  são sempre autônomos, nunca aninhados numa pilha de outra tela. */
const ZINDEX_AUTONOMO = 100;
const semFoco = () => undefined;

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
    <Janela
      id={props.idDaJanela}
      titulo={props.titulo}
      subtitulo={props.rotuloDaTela}
      abertura={ABERTURA_DO_CADASTRO}
      zIndex={ZINDEX_AUTONOMO}
      ativa
      comFundo
      aoFechar={sair}
      aoFocar={semFoco}
    >
      <div className="flex h-full min-h-0 flex-col">
        <header className="border-hairline-light flex items-start gap-4 border-b bg-white px-6 py-4">
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
        </header>

        <div className="border-hairline-light border-b bg-white px-6 py-3">
          <Abas
            idBase={props.idDaJanela}
            abas={props.abas}
            ativa={props.aba}
            aoMudar={props.aoTrocarAba}
            rotulo={props.rotuloDaTela}
            comErro={props.abasComErro}
          />
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
              <PainelDeAba idBase={props.idDaJanela} ativa={props.aba}>
                {props.children}
              </PainelDeAba>
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
      </div>
    </Janela>
  );
}
