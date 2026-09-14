import { CircleAlert, RotateCw, X } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ROTAS } from '../../../app/rotas';
import { ETAPAS } from './assistente.dados';
import type { PropsDeEtapa } from './assistente.tipos';
import { BOTAO_ICONE, BOTAO_SECUNDARIO } from './campos';
import { EtapaConclusao } from './etapas/EtapaConclusao';
import { EtapaEmpresa } from './etapas/EtapaEmpresa';
import { EtapaNfce } from './etapas/EtapaNfce';
import { EtapaNfe } from './etapas/EtapaNfe';
import { EtapaNotaFiscal } from './etapas/EtapaNotaFiscal';
import { EtapaSincronia } from './etapas/EtapaSincronia';
import {
  AvisoFlutuante,
  BarraDeAcoes,
  Cabecalho,
  DescartarAlteracoes,
  JanelaDoAssistente,
  TrilhaDeEtapas,
} from './moldura';
import { type EstadoDoAssistente, useAssistente, useNavegacao } from './useAssistente';
import { useAtalhosDoAssistente } from './useAtalhosDoAssistente';

type Navegacao = ReturnType<typeof useNavegacao>;

/** Grade das duas janelas: a das etapas e a da etapa aberta. A linha e limitada
 *  no desktop para que cada painel role por dentro em vez de estourar a tela. */
const GRADE =
  'mx-auto grid min-h-0 w-full max-w-[1360px] flex-1 gap-3 overflow-y-auto sm:gap-4 lg:grid-cols-[264px_minmax(0,1fr)] 2xl:grid-cols-[304px_minmax(0,1fr)] lg:grid-rows-[minmax(0,1fr)] lg:overflow-hidden';

const PAINEL =
  'border-hairline-light bg-canvas-light shadow-janela flex min-h-0 min-w-0 flex-col overflow-hidden rounded-3xl border lg:h-full';

function ConteudoDaEtapa({
  assistente,
  navegacao,
  aoSalvar,
  aoConcluir,
}: {
  readonly assistente: EstadoDoAssistente;
  readonly navegacao: Navegacao;
  readonly aoSalvar: () => void;
  readonly aoConcluir: () => void;
}) {
  const props: PropsDeEtapa = {
    formulario: assistente.formulario,
    alterar: assistente.alterar,
    segredos: assistente.segredos,
    gravados: assistente.gravados,
    alterarSegredo: assistente.alterarSegredo,
    aba: navegacao.aba,
    aoMudarAba: navegacao.mudarAba,
  };
  const fechamento = {
    pendencias: assistente.pendencias,
    sujo: assistente.sujo,
    salvando: assistente.salvando,
    atualizadoEm: assistente.atualizadoEm,
    irPara: navegacao.irPara,
  };
  switch (navegacao.etapa) {
    case 'empresa':
      return <EtapaEmpresa {...props} />;
    case 'nota-fiscal':
      return <EtapaNotaFiscal {...props} />;
    case 'nfe':
      return <EtapaNfe {...props} />;
    case 'nfce':
      return <EtapaNfce {...props} />;
    case 'sincronia':
      return <EtapaSincronia {...fechamento} aoSincronizar={aoSalvar} />;
    case 'conclusao':
      return <EtapaConclusao {...props} {...fechamento} aoConcluir={aoConcluir} />;
  }
}

function Carregando() {
  return (
    <div aria-busy="true" className={GRADE}>
      <div className="bg-canvas-light/70 shadow-janela hidden min-h-80 animate-pulse rounded-3xl lg:block" />
      <div className="bg-canvas-light/70 shadow-janela min-h-[560px] animate-pulse rounded-3xl" />
    </div>
  );
}

function FalhaAoCarregar({
  mensagem,
  aoTentar,
}: {
  readonly mensagem: string;
  readonly aoTentar: () => void;
}) {
  return (
    <div className="border-hairline-light bg-canvas-light shadow-janela m-auto flex w-full max-w-xl flex-col items-start gap-4 rounded-3xl border p-6 sm:flex-row sm:items-center">
      <span className="bg-surface-soft text-accent-danger flex h-11 w-11 shrink-0 items-center justify-center rounded-full">
        <CircleAlert size={20} aria-hidden="true" />
      </span>
      <span className="flex-1">
        <span className="text-body-md text-ink block font-semibold">
          Não foi possível abrir a configuração fiscal
        </span>
        <span className="text-body-sm text-mute block">{mensagem}</span>
      </span>
      <button type="button" className={BOTAO_SECUNDARIO} onClick={aoTentar}>
        <RotateCw size={15} aria-hidden="true" /> Tentar de novo
      </button>
    </div>
  );
}

function PaineisDoAssistente({
  assistente,
  navegacao,
  aoSalvar,
  aoConcluir,
  aoCancelar,
}: {
  readonly assistente: EstadoDoAssistente;
  readonly navegacao: Navegacao;
  readonly aoSalvar: () => void;
  readonly aoConcluir: () => void;
  readonly aoCancelar: () => void;
}) {
  const corpo = useRef<HTMLDivElement>(null);
  // Trocar de etapa volta ao topo do painel — a pagina atras nao rola mais.
  useEffect(() => {
    corpo.current?.scrollTo({ top: 0 });
  }, [navegacao.etapa]);

  const etapa = ETAPAS[navegacao.indice] ?? ETAPAS[0];
  if (!etapa) return null;
  return (
    <div className={GRADE}>
      <aside className={PAINEL}>
        <Cabecalho
          ambiente={assistente.formulario.environment}
          sujo={assistente.sujo}
          atualizadoEm={assistente.atualizadoEm}
        />
        <TrilhaDeEtapas
          atual={navegacao.etapa}
          pendencias={assistente.pendencias}
          aoEscolher={navegacao.irPara}
        />
      </aside>
      <section aria-labelledby="titulo-da-etapa" className={PAINEL}>
        {/* Uma linha so: o espaco do painel fica para o formulario. */}
        <header className="border-hairline-light bg-surface-soft/50 flex shrink-0 items-center gap-3 border-b py-2.5 pl-5 pr-3 sm:pl-6">
          <span className="text-caption bg-canvas-light border-hairline-light text-charcoal shrink-0 rounded-full border px-2.5 py-0.5 font-semibold">
            Etapa {navegacao.indice + 1} de {ETAPAS.length}
          </span>
          <div className="flex min-w-0 flex-1 items-baseline gap-2">
            <h2
              id="titulo-da-etapa"
              className="text-body-md text-ink truncate font-semibold md:shrink-0"
            >
              {etapa.rotulo}
            </h2>
            <p className="text-caption text-stone hidden truncate md:block" title={etapa.descricao}>
              {etapa.descricao}
            </p>
          </div>
          <button
            type="button"
            aria-label="Fechar o assistente"
            className={BOTAO_ICONE}
            onClick={aoCancelar}
          >
            <X size={18} aria-hidden="true" />
          </button>
        </header>
        <div ref={corpo} className="min-h-0 flex-1 overflow-y-auto p-5 sm:p-8">
          <ConteudoDaEtapa
            assistente={assistente}
            navegacao={navegacao}
            aoSalvar={aoSalvar}
            aoConcluir={aoConcluir}
          />
        </div>
      </section>
    </div>
  );
}

/** Assistente de Configuracao de NF-e: as etapas do Syndata (empresa, nota fiscal,
 *  NF-e, NFC-e, sincronia e conclusao) gravando na config fiscal da API. */
export function AssistenteNfeScreen() {
  const assistente = useAssistente();
  const navegacao = useNavegacao();
  const navigate = useNavigate();
  const area = useRef<HTMLElement>(null);
  const [cancelando, setCancelando] = useState(false);
  const { aviso, fecharAviso } = assistente;

  // Chave de proposito: efeito que devolve algo alem da limpeza derruba a tela.
  useEffect(() => {
    if (aviso?.tom !== 'sucesso') return undefined;
    const temporizador = window.setTimeout(fecharAviso, 4000);
    return () => window.clearTimeout(temporizador);
  }, [aviso, fecharAviso]);

  const salvar = async (): Promise<boolean> => {
    const resultado = await assistente.salvar();
    if (!resultado.ok && resultado.pendencia)
      navegacao.irPara(resultado.pendencia.etapa, resultado.pendencia.aba);
    return resultado.ok;
  };
  const cancelar = () => (assistente.sujo ? setCancelando(true) : navigate(ROTAS.inicio));
  const concluir = async () => {
    if (!assistente.sujo || (await salvar())) navigate(ROTAS.inicio);
  };
  const pronto = assistente.carga.status === 'pronto';

  useAtalhosDoAssistente(area, {
    F6: () => pronto && navegacao.voltar(),
    F7: () => pronto && navegacao.avancar(),
    F8: () => pronto && void salvar(),
    Escape: cancelar,
  });

  return (
    <>
      <JanelaDoAssistente area={area} aoFechar={cancelar}>
        {assistente.carga.status === 'carregando' && <Carregando />}
        {assistente.carga.status === 'erro' && (
          <FalhaAoCarregar mensagem={assistente.carga.mensagem} aoTentar={assistente.recarregar} />
        )}
        {pronto && (
          <>
            <PaineisDoAssistente
              assistente={assistente}
              navegacao={navegacao}
              aoSalvar={() => void salvar()}
              aoConcluir={() => void concluir()}
              aoCancelar={cancelar}
            />
            <BarraDeAcoes
              primeira={navegacao.indice === 0}
              ultima={navegacao.indice === ETAPAS.length - 1}
              salvando={assistente.salvando}
              aoVoltar={navegacao.voltar}
              aoAvancar={navegacao.avancar}
              aoSalvar={() => void salvar()}
              aoCancelar={cancelar}
            />
          </>
        )}
        {aviso && <AvisoFlutuante aviso={aviso} aoFechar={fecharAviso} />}
      </JanelaDoAssistente>
      {cancelando && (
        <DescartarAlteracoes
          aoFechar={() => setCancelando(false)}
          aoDescartar={() => navigate(ROTAS.inicio)}
        />
      )}
    </>
  );
}
