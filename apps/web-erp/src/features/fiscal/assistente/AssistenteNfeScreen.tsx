import { CircleAlert, RotateCw } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ROTAS } from '../../../app/rotas';
import { ETAPAS } from './assistente.dados';
import type { PropsDeEtapa } from './assistente.tipos';
import { BOTAO_SECUNDARIO } from './campos';
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
  TrilhaDeEtapas,
} from './moldura';
import { type EstadoDoAssistente, useAssistente, useNavegacao } from './useAssistente';
import { useAtalhosDoAssistente } from './useAtalhosDoAssistente';

type Navegacao = ReturnType<typeof useNavegacao>;

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
    <div aria-busy="true" className="mt-8 grid gap-8 lg:grid-cols-[248px_minmax(0,1fr)]">
      <div className="bg-surface-soft hidden h-72 animate-pulse rounded-2xl lg:block" />
      <div className="bg-surface-soft h-[520px] animate-pulse rounded-2xl" />
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
    <div className="border-hairline-light mt-8 flex flex-col items-start gap-4 rounded-2xl border p-6 sm:flex-row sm:items-center">
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

/** Assistente de Configuracao de NF-e: as etapas do Syndata (empresa, nota fiscal,
 *  NF-e, NFC-e, sincronia e conclusao) gravando na config fiscal da API. */
export function AssistenteNfeScreen() {
  const assistente = useAssistente();
  const navegacao = useNavegacao();
  const navigate = useNavigate();
  const area = useRef<HTMLElement>(null);
  const [cancelando, setCancelando] = useState(false);
  const { aviso, fecharAviso } = assistente;

  // Chaves de proposito: no Chrome novo scrollTo devolve uma Promise, e efeito
  // que devolve algo alem da limpeza derruba a tela.
  useEffect(() => {
    window.scrollTo({ top: 0 });
  }, [navegacao.etapa]);
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

  const etapa = ETAPAS[navegacao.indice] ?? ETAPAS[0];
  return (
    <main
      ref={area}
      className="mx-auto flex w-full max-w-[1280px] flex-col px-4 pb-32 pt-10 sm:px-6 lg:px-8"
    >
      <Cabecalho
        ambiente={assistente.formulario.environment}
        sujo={assistente.sujo}
        atualizadoEm={assistente.atualizadoEm}
      />
      {assistente.carga.status === 'carregando' && <Carregando />}
      {assistente.carga.status === 'erro' && (
        <FalhaAoCarregar mensagem={assistente.carga.mensagem} aoTentar={assistente.recarregar} />
      )}
      {pronto && etapa && (
        <div className="mt-8 grid gap-6 lg:grid-cols-[248px_minmax(0,1fr)] lg:gap-8">
          <TrilhaDeEtapas
            atual={navegacao.etapa}
            pendencias={assistente.pendencias}
            aoEscolher={navegacao.irPara}
          />
          <section
            aria-labelledby="titulo-da-etapa"
            className="border-hairline-light min-w-0 rounded-2xl border p-5 sm:p-8"
          >
            <header className="mb-8">
              <p className="text-caption text-stone">
                Etapa {navegacao.indice + 1} de {ETAPAS.length}
              </p>
              <h2 id="titulo-da-etapa" className="font-display text-heading-md text-ink mt-1">
                {etapa.rotulo}
              </h2>
              <p className="text-body-sm text-mute mt-1">{etapa.descricao}</p>
            </header>
            <ConteudoDaEtapa
              assistente={assistente}
              navegacao={navegacao}
              aoSalvar={() => void salvar()}
              aoConcluir={() => void concluir()}
            />
          </section>
        </div>
      )}
      {aviso && <AvisoFlutuante aviso={aviso} aoFechar={fecharAviso} />}
      {pronto && (
        <BarraDeAcoes
          primeira={navegacao.indice === 0}
          ultima={navegacao.indice === ETAPAS.length - 1}
          salvando={assistente.salvando}
          aoVoltar={navegacao.voltar}
          aoAvancar={navegacao.avancar}
          aoSalvar={() => void salvar()}
          aoCancelar={cancelar}
        />
      )}
      {cancelando && (
        <DescartarAlteracoes
          aoFechar={() => setCancelando(false)}
          aoDescartar={() => navigate(ROTAS.inicio)}
        />
      )}
    </main>
  );
}
