import { Button, Spinner, Text } from '@synapse/sdl';
import { RotateCw } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ROTAS } from '../../../app/rotas';
import { ETAPAS } from './assistente.dados';
import { formatarDocumento } from './assistente.formato';
import type { EtapaId, Pendencia, PropsDeEtapa } from './assistente.tipos';
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
import { PendenciasDaEtapa } from './PendenciasDaEtapa';
import { type EstadoDoAssistente, useAssistente, useNavegacao } from './useAssistente';
import { useAtalhosDoAssistente } from './useAtalhosDoAssistente';

type Navegacao = ReturnType<typeof useNavegacao>;

/** Etapas que editam dados — as que ganham a faixa de pendências. Sincronia já
 *  é a revisão de tudo; Conclusão é o resumo. */
const ETAPAS_DE_DADOS: ReadonlySet<EtapaId> = new Set(['empresa', 'nota-fiscal', 'nfe', 'nfce']);

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
    erroDoCampo: assistente.erroDoCampo,
    pendencias: assistente.pendencias,
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
    <div className="m-auto flex items-center gap-3" aria-busy="true">
      <Spinner decorative />
      <Text variant="corpoSecundario">Carregando a configuração fiscal…</Text>
    </div>
  );
}

/** Falha ao carregar NÃO mostra formulário com valores padrão: preencher em
 *  cima de um default e salvar sobrescreveria a config real. */
function FalhaAoCarregar({
  mensagem,
  aoTentar,
}: {
  readonly mensagem: string;
  readonly aoTentar: () => void;
}) {
  return (
    <div role="alert" className="m-auto max-w-xl px-6 text-center">
      <Text variant="tituloCartao" as="p">
        Não foi possível abrir a configuração fiscal
      </Text>
      <Text variant="corpoSecundario" className="mt-1">
        {mensagem}
      </Text>
      <Button variant="secondary" className="mt-4" onClick={aoTentar}>
        <RotateCw size={15} aria-hidden="true" /> Tentar de novo
      </Button>
    </div>
  );
}

/** Leva até a pendência clicada: abre etapa/aba e, se ela tem campo, rola até
 *  ele e põe o foco — só por clique, nunca sozinho. */
const useIrParaPendencia = (navegacao: Navegacao) => {
  const [alvo, setAlvo] = useState<string | null>(null);
  useEffect(() => {
    if (!alvo) return;
    const campo = document.querySelector<HTMLElement>(`[data-campo="${alvo}"]`);
    campo?.scrollIntoView({ block: 'center' });
    campo?.querySelector<HTMLElement>('input, select, textarea')?.focus({ preventScroll: true });
    setAlvo(null);
  }, [alvo, navegacao.etapa, navegacao.aba]);
  return (pendencia: Pendencia) => {
    navegacao.irPara(pendencia.etapa, pendencia.aba);
    if (pendencia.campo) setAlvo(pendencia.campo);
  };
};

function AreaDeTrabalho({
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
  const irPara = useIrParaPendencia(navegacao);
  // Trocar de etapa ou de aba volta ao topo — onde está a faixa de pendências.
  useEffect(() => {
    corpo.current?.scrollTo({ top: 0 });
  }, [navegacao.etapa, navegacao.aba]);
  const etapa = ETAPAS[navegacao.indice] ?? ETAPAS[0];
  if (!etapa) return null;
  return (
    <section
      data-area-de-trabalho
      aria-labelledby="titulo-da-etapa"
      className="bg-surface-pagina flex min-h-0 min-w-0 flex-col"
    >
      <div ref={corpo} className="min-h-0 flex-1 overflow-y-auto">
        <div className="max-w-conteudo-ampla px-4 py-5 sm:px-8 lg:px-10">
          <header className="mb-5">
            <div className="flex flex-wrap items-baseline gap-x-3">
              <Text variant="tituloSecao" as="h2" id="titulo-da-etapa">
                {etapa.rotulo}
              </Text>
              <Text variant="legenda">
                Etapa {navegacao.indice + 1} de {ETAPAS.length}
              </Text>
            </div>
            <Text variant="corpoSecundario" className="mt-0.5">
              {etapa.descricao}
            </Text>
          </header>
          {ETAPAS_DE_DADOS.has(etapa.id) && (
            <PendenciasDaEtapa
              pendencias={assistente.pendencias.filter((p) => p.etapa === etapa.id)}
              abaAtual={navegacao.aba}
              revelar={assistente.revelar}
              aoIr={irPara}
            />
          )}
          <div className="space-y-8">
            <ConteudoDaEtapa
              assistente={assistente}
              navegacao={navegacao}
              aoSalvar={aoSalvar}
              aoConcluir={aoConcluir}
            />
          </div>
        </div>
      </div>
      <BarraDeAcoes
        primeira={navegacao.indice === 0}
        ultima={navegacao.indice === ETAPAS.length - 1}
        salvando={assistente.salvando}
        aoVoltar={navegacao.voltar}
        aoAvancar={navegacao.avancar}
        aoSalvar={aoSalvar}
        aoCancelar={aoCancelar}
      />
    </section>
  );
}

/** Assistente de Configuração de NF-e: as etapas do Syndata (empresa, nota
 *  fiscal, NF-e, NFC-e, sincronia e conclusão) gravando na config fiscal da
 *  API. Fase 8: uma superfície só — contexto em cima, etapas à esquerda, área
 *  de trabalho (a única região que rola) e ações presas ao pé dela. */
export function AssistenteNfeScreen() {
  const assistente = useAssistente();
  const navegacao = useNavegacao();
  const navigate = useNavigate();
  const area = useRef<HTMLElement>(null);
  const [cancelando, setCancelando] = useState(false);
  const { aviso, fecharAviso } = assistente;

  // Chave de propósito: efeito que devolve algo além da limpeza derruba a tela.
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
  const { issuer, environment } = assistente.formulario;

  useAtalhosDoAssistente(area, {
    F6: () => pronto && navegacao.voltar(),
    F7: () => pronto && navegacao.avancar(),
    F8: () => pronto && void salvar(),
    Escape: cancelar,
  });

  return (
    <>
      <JanelaDoAssistente area={area}>
        <Cabecalho
          ambiente={environment}
          empresa={pronto ? issuer.tradeName || issuer.legalName || 'Empresa sem nome' : '—'}
          documento={pronto && issuer.document ? formatarDocumento(issuer.document) : ''}
          sujo={assistente.sujo}
          atualizadoEm={assistente.atualizadoEm}
          aoFechar={cancelar}
        />
        {assistente.carga.status === 'carregando' && <Carregando />}
        {assistente.carga.status === 'erro' && (
          <FalhaAoCarregar mensagem={assistente.carga.mensagem} aoTentar={assistente.recarregar} />
        )}
        {pronto && (
          <div className="grid min-h-0 flex-1 grid-rows-[auto_minmax(0,1fr)] lg:grid-cols-[260px_minmax(0,1fr)] lg:grid-rows-1">
            <TrilhaDeEtapas
              atual={navegacao.etapa}
              pendencias={assistente.pendencias}
              aoEscolher={navegacao.irPara}
            />
            <AreaDeTrabalho
              assistente={assistente}
              navegacao={navegacao}
              aoSalvar={() => void salvar()}
              aoConcluir={() => void concluir()}
              aoCancelar={cancelar}
            />
          </div>
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
