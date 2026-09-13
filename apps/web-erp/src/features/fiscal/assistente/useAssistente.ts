import type { FiscalCompanyConfig } from '@synapse/types';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { carregarConfigFiscal, salvarConfigFiscal } from './assistente.api';
import { ETAPAS } from './assistente.dados';
import { deConfig, formularioPadrao, segredosGravados, segredosVazios } from './assistente.padrao';
import { paraPayload } from './assistente.payload';
import { listarPendencias } from './assistente.pendencias';
import type { AlterarFormulario, AlterarSegredo, EtapaId, Pendencia } from './assistente.tipos';

export type Carga =
  | { readonly status: 'carregando' }
  | { readonly status: 'erro'; readonly mensagem: string }
  | { readonly status: 'pronto' };

export interface Aviso {
  readonly tom: 'sucesso' | 'erro';
  readonly texto: string;
}

export type ResultadoDoSalvar =
  { readonly ok: true } | { readonly ok: false; readonly pendencia?: Pendencia };

const mensagemDe = (erro: unknown, padrao: string) =>
  erro instanceof Error ? erro.message : padrao;

function useFormularioFiscal() {
  const [companyId, setCompanyId] = useState('');
  const [formulario, setFormulario] = useState(formularioPadrao);
  const [salvo, setSalvo] = useState(formularioPadrao);
  const [segredos, setSegredos] = useState(segredosVazios);
  const [gravados, setGravados] = useState(() => segredosGravados(null));
  const [atualizadoEm, setAtualizadoEm] = useState<string | null>(null);

  const aplicar = useCallback((id: string, config: FiscalCompanyConfig | null) => {
    const carregado = deConfig(config);
    setCompanyId(id);
    setFormulario(carregado);
    setSalvo(carregado);
    setSegredos(segredosVazios());
    setGravados(segredosGravados(config));
    setAtualizadoEm(config?.updatedAt ?? null);
  }, []);
  const alterar: AlterarFormulario = useCallback((mudar) => setFormulario(mudar), []);
  const alterarSegredo: AlterarSegredo = useCallback(
    (chave, valor) => setSegredos((atual) => ({ ...atual, [chave]: valor })),
    [],
  );
  const sujo = useMemo(
    () =>
      JSON.stringify(formulario) !== JSON.stringify(salvo) ||
      Object.values(segredos).some((valor) => valor !== ''),
    [formulario, salvo, segredos],
  );

  return {
    companyId,
    formulario,
    segredos,
    gravados,
    atualizadoEm,
    sujo,
    aplicar,
    alterar,
    alterarSegredo,
  };
}

/** Estado do assistente: carrega a config da empresa logada, acompanha o que foi
 *  alterado e grava tudo de uma vez (F8), como o Salvar Configuracao do Syndata. */
export function useAssistente() {
  const estado = useFormularioFiscal();
  const { aplicar, companyId, formulario, segredos, gravados } = estado;
  const [carga, setCarga] = useState<Carga>({ status: 'carregando' });
  const [salvando, setSalvando] = useState(false);
  const [aviso, setAviso] = useState<Aviso | null>(null);
  const [tentativa, setTentativa] = useState(0);

  useEffect(() => {
    let ativo = true;
    setCarga({ status: 'carregando' });
    carregarConfigFiscal()
      .then((resposta) => {
        if (!ativo) return;
        aplicar(resposta.companyId, resposta.config);
        setCarga({ status: 'pronto' });
      })
      .catch((erro: unknown) => {
        if (ativo) setCarga({ status: 'erro', mensagem: mensagemDe(erro, 'Falha ao carregar.') });
      });
    return () => {
      ativo = false;
    };
  }, [aplicar, tentativa]);

  const pendencias = useMemo(
    () => listarPendencias(formulario, segredos, gravados),
    [formulario, segredos, gravados],
  );

  const salvar = async (): Promise<ResultadoDoSalvar> => {
    const bloqueio = pendencias.find((pendencia) => pendencia.bloqueia);
    if (bloqueio) {
      setAviso({ tom: 'erro', texto: `Antes de salvar: ${bloqueio.mensagem}` });
      return { ok: false, pendencia: bloqueio };
    }
    setSalvando(true);
    setAviso(null);
    try {
      const config = await salvarConfigFiscal(paraPayload(companyId, formulario, segredos));
      aplicar(companyId, config);
      setAviso({ tom: 'sucesso', texto: 'Configuração salva no servidor.' });
      return { ok: true };
    } catch (erro) {
      setAviso({ tom: 'erro', texto: mensagemDe(erro, 'Não foi possível salvar.') });
      return { ok: false };
    } finally {
      setSalvando(false);
    }
  };

  return {
    ...estado,
    carga,
    salvando,
    aviso,
    pendencias,
    salvar,
    fecharAviso: () => setAviso(null),
    recarregar: () => setTentativa((atual) => atual + 1),
  };
}

export type EstadoDoAssistente = ReturnType<typeof useAssistente>;

const abasIniciais = () =>
  Object.fromEntries(ETAPAS.map((etapa) => [etapa.id, etapa.abas[0]?.id ?? ''])) as Record<
    EtapaId,
    string
  >;

export function useNavegacao() {
  const [etapa, setEtapa] = useState<EtapaId>('empresa');
  const [abas, setAbas] = useState(abasIniciais);
  const indice = ETAPAS.findIndex((item) => item.id === etapa);

  const irPara = useCallback((destino: EtapaId, aba?: string) => {
    setEtapa(destino);
    if (aba) setAbas((atuais) => ({ ...atuais, [destino]: aba }));
  }, []);

  return {
    etapa,
    indice,
    aba: abas[etapa],
    irPara,
    mudarAba: (aba: string) => setAbas((atuais) => ({ ...atuais, [etapa]: aba })),
    voltar: () => setEtapa(ETAPAS[Math.max(indice - 1, 0)]?.id ?? etapa),
    avancar: () => setEtapa(ETAPAS[Math.min(indice + 1, ETAPAS.length - 1)]?.id ?? etapa),
  };
}
