import {
  Button,
  IconButton,
  Kbd,
  Status,
  SynapseSignal,
  TAMANHO_DE_ICONE,
  Text,
  type TomDeStatus,
} from '@synapse/sdl';
import type { FiscalEnvironment } from '@synapse/types';
import { Modal, useOverlayClose } from '@synapse/ui';
import { ArrowLeft, ArrowRight, CircleAlert, CircleCheck, X } from 'lucide-react';
import { type ReactNode, type RefObject, useEffect } from 'react';
import { ETAPAS, rotuloDoAmbiente } from './assistente.dados';
import { quando } from './assistente.formato';
import type { EtapaId, Pendencia } from './assistente.tipos';
import { resumoDePendencias } from './pendencias.resumo';
import type { Aviso } from './useAssistente';

/** Moldura do assistente fiscal (Fase 8): uma superfície só, em tela cheia —
 *  cabeçalho de contexto, trilho de etapas, área de trabalho (a ÚNICA região
 *  que rola) e a barra de ações presa ao pé da área de trabalho.
 *
 *  De propósito não leva `role="dialog"`: os atalhos F6/F7/F8/Esc se desligam
 *  quando existe diálogo aberto na página, e quem abre diálogo aqui é o
 *  descarte de alterações — que precisa mesmo tirar os atalhos do assistente. */
export function JanelaDoAssistente({
  area,
  children,
}: {
  readonly area: RefObject<HTMLElement | null>;
  readonly children: ReactNode;
}) {
  // A página atrás do assistente não rola enquanto ele está aberto.
  useEffect(() => {
    const anterior = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = anterior;
    };
  }, []);
  return (
    <div data-assistente className="bg-surface-tela fixed inset-0 z-40 flex flex-col">
      <main ref={area} className="flex min-h-0 flex-1 flex-col">
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
  const Icone = erro ? CircleAlert : CircleCheck;
  return (
    <div
      role={erro ? 'alert' : 'status'}
      className="bg-surface-inversa text-ink-inverso text-body-sm rounded-painel shadow-cartao fixed bottom-20 left-1/2 z-50 flex w-[calc(100%-32px)] max-w-lg -translate-x-1/2 items-start gap-3 px-4 py-3"
    >
      <Icone size={TAMANHO_DE_ICONE.padrao} className="mt-0.5 shrink-0" aria-hidden="true" />
      <span className="flex-1">{aviso.texto}</span>
      <button
        type="button"
        onClick={aoFechar}
        className="text-caption rounded-minimo focus-visible:ring-primary/40 font-semibold opacity-80 outline-none hover:opacity-100 focus-visible:ring-2"
      >
        Fechar
      </button>
    </div>
  );
}

/** Ambiente fiscal com significado: produção é o que tem validade fiscal. */
const TOM_DO_AMBIENTE: Readonly<Record<FiscalEnvironment, TomDeStatus>> = {
  PRODUCAO: 'perigo',
  HOMOLOGACAO: 'atencao',
  SANDBOX: 'neutro',
  MOCK: 'neutro',
};

/** Responde, numa linha: o que estou configurando, de qual empresa, em que
 *  ambiente e se há algo não salvo. */
export function Cabecalho({
  ambiente,
  empresa,
  documento,
  sujo,
  atualizadoEm,
  aoFechar,
}: {
  readonly ambiente: FiscalEnvironment;
  readonly empresa: string;
  readonly documento: string;
  readonly sujo: boolean;
  readonly atualizadoEm: string | null;
  readonly aoFechar: () => void;
}) {
  return (
    <header
      data-cabecalho-do-assistente
      className="border-line-fina flex shrink-0 flex-wrap items-center gap-x-6 gap-y-1 border-b px-4 py-2.5 sm:px-6"
    >
      <div className="min-w-0">
        <Text variant="legenda" as="p">
          Configuração fiscal
        </Text>
        <Text variant="tituloCartao" as="h1">
          Assistente de Configuração de NF-e
        </Text>
      </div>
      <div className="border-line-fina hidden min-w-0 border-l pl-6 md:block">
        <Text variant="legenda" as="p">
          Empresa emitente
        </Text>
        <Text variant="corpo" as="p" className="truncate font-medium">
          {empresa}
          {documento && (
            <Text variant="dado" tone="apoio" className="ml-2">
              {documento}
            </Text>
          )}
        </Text>
      </div>
      <div className="ml-auto flex items-center gap-4">
        <Status tone={TOM_DO_AMBIENTE[ambiente]}>{rotuloDoAmbiente(ambiente)}</Status>
        <Status tone={sujo ? 'atencao' : 'neutro'}>
          {sujo ? 'Alterações não salvas' : `Salvo ${quando(atualizadoEm)}`}
        </Status>
        <IconButton label="Fechar o assistente" onClick={aoFechar}>
          <X size={TAMANHO_DE_ICONE.padrao} aria-hidden="true" />
        </IconButton>
      </div>
    </header>
  );
}

/** Trilho de etapas. A etapa atual se marca por posição, peso, plano e o
 *  Synapse Signal — a cor é reforço. Pendência mostra a CONTAGEM (legível em
 *  escala de cinza), não só um ponto colorido. Todas as etapas são
 *  revisitáveis: o assistente nunca travou a navegação. */
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
      className="border-line-fina min-w-0 border-b lg:overflow-y-auto lg:border-b-0 lg:border-r"
    >
      <ol className="flex gap-1 overflow-x-auto p-2 lg:flex-col lg:gap-0.5 lg:overflow-visible lg:p-3">
        {ETAPAS.map((etapa, indice) => {
          const ativa = etapa.id === atual;
          const { bloqueios, texto } = resumoDePendencias(
            pendencias.filter((p) => p.etapa === etapa.id),
          );
          return (
            <li key={etapa.id} className="shrink-0 lg:shrink">
              <button
                type="button"
                onClick={() => aoEscolher(etapa.id)}
                aria-current={ativa ? 'step' : undefined}
                className={`rounded-controle focus-visible:ring-primary/40 relative flex min-h-10 w-full items-center gap-2.5 px-3 py-2 text-left outline-none transition-colors focus-visible:ring-2 ${ativa ? 'bg-surface-hover text-ink' : 'text-ink-medio hover:bg-surface-suave hover:text-ink'}`}
              >
                <SynapseSignal ativo={ativa} />
                <Text variant="dado" tone={ativa ? 'padrao' : 'sutil'} className="text-caption">
                  {String(indice + 1).padStart(2, '0')}
                </Text>
                <span
                  className={`text-body-sm flex-1 whitespace-nowrap ${ativa ? 'font-semibold' : ''}`}
                >
                  {etapa.rotulo}
                </span>
                {texto && <span className="sr-only">, {texto}</span>}
                {texto && (
                  <Status
                    tone={bloqueios > 0 ? 'perigo' : 'atencao'}
                    title={texto}
                    aria-hidden="true"
                  >
                    <span className="font-data">
                      {pendencias.filter((p) => p.etapa === etapa.id).length}
                    </span>
                  </Status>
                )}
              </button>
            </li>
          );
        })}
      </ol>
    </nav>
  );
}

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
      className="border-line-fina bg-surface-pagina flex shrink-0 flex-wrap items-center gap-2 border-t px-4 py-2.5 sm:px-6"
    >
      <Button variant="secondary" onClick={aoVoltar} disabled={primeira}>
        <ArrowLeft size={TAMANHO_DE_ICONE.padrao} aria-hidden="true" /> Voltar <Kbd>F6</Kbd>
      </Button>
      <Button variant="secondary" onClick={aoAvancar} disabled={ultima}>
        Próximo <Kbd>F7</Kbd> <ArrowRight size={TAMANHO_DE_ICONE.padrao} aria-hidden="true" />
      </Button>
      <span className="flex-1" />
      <Button variant="quiet" onClick={aoCancelar}>
        Cancelar <Kbd>Esc</Kbd>
      </Button>
      <Button variant="primary" onClick={aoSalvar} loading={salvando}>
        Salvar configuração
        <Kbd className="text-primary-on border-transparent bg-white/15">F8</Kbd>
      </Button>
    </div>
  );
}

function RodapeDoDescarte({ aoDescartar }: { readonly aoDescartar: () => void }) {
  const fechar = useOverlayClose();
  return (
    <>
      <Button variant="quiet" onClick={fechar}>
        Continuar editando
      </Button>
      <Button variant="danger" onClick={aoDescartar}>
        Descartar e sair
      </Button>
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
      <Text variant="corpoSecundario">
        A configuração que já está no servidor continua valendo.
      </Text>
    </Modal>
  );
}
