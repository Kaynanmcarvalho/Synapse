import type { FiscalEnvironment } from '@synapse/types';
import { Modal, useOverlayClose } from '@synapse/ui';
import {
  ArrowLeft,
  ArrowRight,
  ChevronRight,
  CircleAlert,
  CircleCheck,
  LoaderCircle,
  Save,
  X,
} from 'lucide-react';
import { ETAPAS, rotuloDoAmbiente } from './assistente.dados';
import { quando } from './assistente.formato';
import type { EtapaId, Pendencia } from './assistente.tipos';
import { BOTAO_PRIMARIO, BOTAO_SECUNDARIO } from './campos';
import type { Aviso } from './useAssistente';

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
      className="bg-ink text-body-sm fixed bottom-24 left-1/2 z-30 flex w-[calc(100%-32px)] max-w-lg -translate-x-1/2 items-start gap-3 rounded-2xl px-4 py-3 text-white shadow-lg"
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
    <header>
      <nav
        aria-label="Localização no menu"
        className="text-body-sm text-stone flex flex-wrap items-center gap-1"
      >
        Configurações <ChevronRight size={14} aria-hidden="true" />
        <span className="text-ink font-semibold">Assistente de Configuração de NF-e</span>
      </nav>
      <div className="mt-4 flex flex-wrap items-end justify-between gap-4">
        <h1 className="font-display text-ink sm:text-display-md text-[32px] font-medium leading-tight tracking-[-0.4px]">
          Assistente de Configuração
        </h1>
        <div className="flex flex-wrap items-center gap-3">
          <span
            className={`text-button-sm inline-flex h-8 items-center gap-2 rounded-full px-3 ${TOM_DO_AMBIENTE[ambiente]}`}
          >
            <span aria-hidden="true" className="h-1.5 w-1.5 rounded-full bg-current" />
            {rotuloDoAmbiente(ambiente)}
          </span>
          <span className="text-body-sm text-stone">
            {sujo ? 'Alterações não salvas' : `Salvo ${quando(atualizadoEm)}`}
          </span>
        </div>
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
    <nav aria-label="Etapas do assistente" className="lg:sticky lg:top-24 lg:self-start">
      <ol className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1 lg:mx-0 lg:flex-col lg:gap-1 lg:overflow-visible lg:px-0">
        {ETAPAS.map((etapa, indice) => {
          const ativa = etapa.id === atual;
          const bloqueios = pendencias.filter((p) => p.etapa === etapa.id && p.bloqueia).length;
          const avisos = pendencias.filter((p) => p.etapa === etapa.id).length;
          return (
            <li key={etapa.id} className="shrink-0">
              <button
                type="button"
                onClick={() => aoEscolher(etapa.id)}
                aria-current={ativa ? 'step' : undefined}
                className={`text-body-sm flex h-11 w-full items-center gap-3 rounded-full px-3 text-left transition lg:rounded-xl ${ativa ? 'bg-surface-soft text-ink font-semibold' : 'text-mute hover:text-ink'}`}
              >
                <span
                  aria-hidden="true"
                  className={`text-caption flex h-6 w-6 shrink-0 items-center justify-center rounded-full font-semibold ${ativa ? 'bg-ink text-white' : 'bg-surface-soft text-charcoal'}`}
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
    <div className="border-hairline-light bg-canvas-light/95 fixed inset-x-0 bottom-0 z-20 border-t backdrop-blur-xl">
      <div className="mx-auto flex max-w-[1280px] flex-wrap items-center gap-2 px-4 py-3 sm:px-6 lg:px-8">
        <button type="button" className={BOTAO_SECUNDARIO} onClick={aoVoltar} disabled={primeira}>
          <ArrowLeft size={16} aria-hidden="true" /> <Tecla>F6</Tecla> Voltar
        </button>
        <button type="button" className={BOTAO_SECUNDARIO} onClick={aoAvancar} disabled={ultima}>
          <Tecla>F7</Tecla> Próximo <ArrowRight size={16} aria-hidden="true" />
        </button>
        <span className="flex-1" />
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
