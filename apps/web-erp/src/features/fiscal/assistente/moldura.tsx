import type { FiscalEnvironment } from '@synapse/types';
import { Modal, useOverlayClose } from '@synapse/ui';
import {
  ArrowLeft,
  ArrowRight,
  CircleAlert,
  CircleCheck,
  LoaderCircle,
  Save,
  X,
} from 'lucide-react';
import { type ReactNode, type RefObject, useEffect } from 'react';
import { ETAPAS, rotuloDoAmbiente } from './assistente.dados';
import { quando } from './assistente.formato';
import type { EtapaId, Pendencia } from './assistente.tipos';
import { BOTAO_PRIMARIO, BOTAO_SECUNDARIO } from './campos';
import type { Aviso } from './useAssistente';

/** Janela do assistente: fundo escurecido, os paineis flutuando por cima e a
 *  barra de acoes logo abaixo deles.
 *
 *  De proposito nao leva `role="dialog"`: os atalhos F6/F7/F8/Esc se desligam
 *  quando existe dialogo aberto na pagina, e quem abre dialogo aqui e o
 *  descarte de alteracoes — que precisa mesmo tirar os atalhos do assistente. */
export function JanelaDoAssistente({
  area,
  aoFechar,
  children,
}: {
  readonly area: RefObject<HTMLElement | null>;
  readonly aoFechar: () => void;
  readonly children: ReactNode;
}) {
  // A pagina atras da janela nao rola enquanto o assistente esta aberto.
  useEffect(() => {
    const anterior = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = anterior;
    };
  }, []);
  return (
    <div className="fixed inset-0 z-40 flex flex-col">
      <button
        type="button"
        tabIndex={-1}
        aria-label="Fechar o assistente"
        onClick={aoFechar}
        className="animate-backdrop-in absolute inset-0 h-full w-full cursor-default bg-slate-950/55 backdrop-blur-md motion-reduce:animate-none"
      />
      <main
        ref={area}
        className="animate-modal-in relative flex min-h-0 flex-1 flex-col gap-3 p-3 motion-reduce:animate-none sm:gap-4 sm:p-5 lg:p-6"
      >
        {children}
      </main>
    </div>
  );
}

export function AvisoFlutuante({
  aviso,
  aoFechar,
}: {
  readonly aviso: Aviso;
  readonly aoFechar: () => void;
}) {
  const erro = aviso.tom === 'erro';
  return (
    <div
      role={erro ? 'alert' : 'status'}
      className="bg-ink text-body-sm fixed bottom-28 left-1/2 z-30 flex w-[calc(100%-32px)] max-w-lg -translate-x-1/2 items-start gap-3 rounded-2xl px-4 py-3 text-white shadow-lg"
    >
      {erro ? (
        <CircleAlert size={18} className="mt-0.5 shrink-0 text-[#ff8a95]" aria-hidden="true" />
      ) : (
        <CircleCheck size={18} className="mt-0.5 shrink-0 text-[#5fe0bd]" aria-hidden="true" />
      )}
      <span className="flex-1">{aviso.texto}</span>
      <button
        type="button"
        onClick={aoFechar}
        className="text-caption font-semibold text-white/70 hover:text-white"
      >
        Fechar
      </button>
    </div>
  );
}

const TOM_DO_AMBIENTE: Record<FiscalEnvironment, string> = {
  PRODUCAO: 'bg-[#fdecee] text-accent-deep-red',
  HOMOLOGACAO: 'bg-[#fff4e5] text-[#8a4b00]',
  SANDBOX: 'bg-surface-soft text-charcoal',
  MOCK: 'bg-surface-soft text-charcoal',
};

/** Cabecalho da janela: mora no alto do painel das etapas, que e por onde o
 *  assistente comeca. */
export function Cabecalho({
  ambiente,
  sujo,
  atualizadoEm,
}: {
  readonly ambiente: FiscalEnvironment;
  readonly sujo: boolean;
  readonly atualizadoEm: string | null;
}) {
  return (
    <header className="border-hairline-light shrink-0 border-b px-4 py-3 2xl:px-5 2xl:pb-4 2xl:pt-5">
      <p className="text-stone 2xl:text-caption hidden text-[11px] font-medium uppercase tracking-[0.08em] lg:block">
        Configurações · Fiscal
      </p>
      <h1 className="font-display text-body-sm text-ink 2xl:text-heading-sm font-semibold leading-snug lg:mt-0.5 2xl:mt-1 2xl:font-medium 2xl:leading-tight">
        Assistente de Configuração de NF-e
      </h1>
      <div className="mt-2 flex flex-wrap items-center gap-2 2xl:mt-3">
        <span
          className={`2xl:text-caption inline-flex h-6 items-center gap-1.5 rounded-full px-2 text-[12px] font-semibold 2xl:h-7 2xl:gap-2 2xl:px-2.5 ${TOM_DO_AMBIENTE[ambiente]}`}
        >
          <span aria-hidden="true" className="h-1.5 w-1.5 rounded-full bg-current" />
          {rotuloDoAmbiente(ambiente)}
        </span>
        <span className="text-stone 2xl:text-caption text-[12px]">
          {sujo ? 'Alterações não salvas' : `Salvo ${quando(atualizadoEm)}`}
        </span>
      </div>
    </header>
  );
}

export function TrilhaDeEtapas({
  atual,
  pendencias,
  aoEscolher,
}: {
  readonly atual: EtapaId;
  readonly pendencias: readonly Pendencia[];
  readonly aoEscolher: (etapa: EtapaId) => void;
}) {
  return (
    <nav
      aria-label="Etapas do assistente"
      className="min-w-0 lg:min-h-0 lg:flex-1 lg:overflow-y-auto"
    >
      <p className="text-caption text-stone hidden px-5 pt-4 2xl:block">6 etapas para concluir</p>
      <ol className="flex gap-1.5 overflow-x-auto p-2 lg:flex-col lg:gap-0.5 lg:overflow-visible 2xl:mt-1 2xl:gap-1 2xl:px-3 2xl:pb-4">
        {ETAPAS.map((etapa, indice) => {
          const ativa = etapa.id === atual;
          const bloqueios = pendencias.filter((p) => p.etapa === etapa.id && p.bloqueia).length;
          const avisos = pendencias.filter((p) => p.etapa === etapa.id).length;
          return (
            <li key={etapa.id} className="shrink-0 lg:shrink">
              <button
                type="button"
                onClick={() => aoEscolher(etapa.id)}
                aria-current={ativa ? 'step' : undefined}
                className={`text-caption 2xl:text-body-sm flex min-h-10 w-full items-center gap-2.5 rounded-xl px-2.5 py-1.5 text-left transition 2xl:min-h-12 2xl:gap-3 2xl:rounded-2xl 2xl:px-3 2xl:py-2.5 ${ativa ? 'bg-canvas-dark shadow-cartao font-semibold text-white' : 'text-mute hover:bg-surface-soft hover:text-ink'}`}
              >
                <span
                  aria-hidden="true"
                  className={`2xl:text-caption flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-[12px] font-semibold 2xl:h-7 2xl:w-7 ${ativa ? 'bg-white/15 text-white' : 'bg-surface-soft text-charcoal'}`}
                >
                  {indice + 1}
                </span>
                <span className="flex-1 whitespace-nowrap">{etapa.rotulo}</span>
                {avisos > 0 && (
                  <span
                    title={`${avisos} pendência(s)`}
                    className={`h-2 w-2 shrink-0 rounded-full ${bloqueios > 0 ? 'bg-accent-danger' : 'bg-accent-warning'}`}
                  />
                )}
              </button>
            </li>
          );
        })}
      </ol>
    </nav>
  );
}

const Tecla = ({ children }: { readonly children: string }) => (
  <kbd className="text-caption hidden rounded-md bg-black/5 px-1.5 font-sans font-medium sm:inline">
    {children}
  </kbd>
);

export function BarraDeAcoes({
  primeira,
  ultima,
  salvando,
  aoVoltar,
  aoAvancar,
  aoSalvar,
  aoCancelar,
}: {
  readonly primeira: boolean;
  readonly ultima: boolean;
  readonly salvando: boolean;
  readonly aoVoltar: () => void;
  readonly aoAvancar: () => void;
  readonly aoSalvar: () => void;
  readonly aoCancelar: () => void;
}) {
  return (
    <div
      aria-label="Ações do assistente"
      className="border-hairline-light bg-canvas-light/95 shadow-janela mx-auto flex w-full max-w-[940px] shrink-0 flex-wrap items-center gap-2 rounded-2xl border p-2 backdrop-blur-xl sm:flex-nowrap sm:px-3"
    >
      <button type="button" className={BOTAO_SECUNDARIO} onClick={aoVoltar} disabled={primeira}>
        <ArrowLeft size={16} aria-hidden="true" /> <Tecla>F6</Tecla> Voltar
      </button>
      <button type="button" className={BOTAO_SECUNDARIO} onClick={aoAvancar} disabled={ultima}>
        <Tecla>F7</Tecla> Próximo <ArrowRight size={16} aria-hidden="true" />
      </button>
      <span className="hidden flex-1 sm:block" />
      <button type="button" className={BOTAO_SECUNDARIO} onClick={aoCancelar}>
        <X size={16} aria-hidden="true" /> <Tecla>Esc</Tecla> Cancelar
      </button>
      <button type="button" className={BOTAO_PRIMARIO} onClick={aoSalvar} disabled={salvando}>
        {salvando ? (
          <LoaderCircle size={16} className="animate-spin" aria-hidden="true" />
        ) : (
          <Save size={16} aria-hidden="true" />
        )}
        <kbd className="text-caption hidden rounded-md bg-white/15 px-1.5 font-sans font-medium sm:inline">
          F8
        </kbd>
        Salvar configuração
      </button>
    </div>
  );
}

function RodapeDoDescarte({ aoDescartar }: { readonly aoDescartar: () => void }) {
  const fechar = useOverlayClose();
  return (
    <>
      <button type="button" className={BOTAO_SECUNDARIO} onClick={fechar}>
        Continuar editando
      </button>
      <button type="button" className={BOTAO_PRIMARIO} onClick={aoDescartar}>
        Descartar e sair
      </button>
    </>
  );
}

export function DescartarAlteracoes({
  aoFechar,
  aoDescartar,
}: {
  readonly aoFechar: () => void;
  readonly aoDescartar: () => void;
}) {
  return (
    <Modal
      onClose={aoFechar}
      size="sm"
      title="Descartar alterações?"
      description="O que foi alterado e ainda não foi salvo (F8) será perdido."
      footer={<RodapeDoDescarte aoDescartar={aoDescartar} />}
    >
      <p className="text-body-sm text-mute">
        A configuração que já está no servidor continua valendo.
      </p>
    </Modal>
  );
}
