import type {
  AcaoDeCredito,
  PainelDeAnaliseDeCredito,
  PedidoDeVenda,
  ResultadoDaDecisao,
  ResultadoDaLiberacao,
} from '@synapse/types';
import { avaliarLote, type AvaliacaoDoLote } from '@synapse/validation';
import { useCallback, useMemo, useState } from 'react';
import { liberarPedidos, observarPedido } from './analise.api';

export type Resultado = { readonly mensagem: string; readonly tom: 'sucesso' | 'alerta' } | null;

const plural = (quantos: number, um: string, varios: string) => (quantos === 1 ? um : varios);

const LOTE_VAZIO: AvaliacaoDoLote = {
  itens: [],
  valorComercialCentavos: 0,
  exposicaoCentavos: 0,
  disponivelDepoisCentavos: null,
  utilizacaoDepoisPercentual: null,
  excepcionais: [],
};

/** A selecao avaliada com a mesma regra de lote que a API usa: o botao e a
 *  confirmacao dizem antes o que o servidor vai fazer. */
export const loteDaSelecao = (
  dados: PainelDeAnaliseDeCredito | null,
  selecionados: ReadonlySet<string>,
): AvaliacaoDoLote => {
  if (!dados) return LOTE_VAZIO;
  const avaliacoes = new Map(dados.avaliacoes.map((avaliacao) => [avaliacao.pedidoId, avaliacao]));
  const pedidos = dados.pedidosEmAnalise.flatMap((pedido) => {
    const avaliacao = avaliacoes.get(pedido.id);
    return selecionados.has(pedido.id) && avaliacao
      ? [{ pedidoId: pedido.id, enviadoEm: pedido.enviadoEm, exposicao: avaliacao.exposicao }]
      : [];
  });
  const lote = avaliarLote(dados.situacao, pedidos, dados.parametros);
  return pedidos.length === 0
    ? { ...lote, disponivelDepoisCentavos: dados.situacao.disponivelCentavos }
    : lote;
};

/** O aviso depois da aprovacao em lote: o que foi, quantos por excecao e, para
 *  o que ficou, o motivo que a API devolveu. */
export const mensagemDaLiberacao = ({
  liberados,
  recusados,
  excepcionais = [],
}: ResultadoDaLiberacao): NonNullable<Resultado> => {
  const partes = [
    liberados.length > 0 &&
      `${liberados.length} ${plural(liberados.length, 'pedido aprovado e enviado', 'pedidos aprovados e enviados')} ao faturamento${
        excepcionais.length > 0
          ? ` (${excepcionais.length} fora da política, com justificativa)`
          : ''
      }.`,
    ...recusados.map((recusa) => recusa.motivo),
  ].filter(Boolean);
  return { mensagem: partes.join(' '), tom: recusados.length ? 'alerta' : 'sucesso' };
};

const MENSAGEM_DA_DECISAO: Record<AcaoDeCredito, (numero: number) => string> = {
  APROVAR: (numero) => `Pedido ${numero} aprovado e enviado ao faturamento.`,
  APROVAR_EXCECAO: (numero) =>
    `Pedido ${numero} aprovado fora da política, com a justificativa registrada no histórico.`,
  REPROVAR: (numero) => `Pedido ${numero} reprovado. A justificativa ficou no histórico do pedido.`,
};

/** Pedidos marcados e o lote que eles formam. */
const useSelecao = (dados: PainelDeAnaliseDeCredito | null) => {
  const [selecionados, setSelecionados] = useState<ReadonlySet<string>>(new Set());
  const lote = useMemo(() => loteDaSelecao(dados, selecionados), [dados, selecionados]);
  const alternarSelecao = useCallback((id: string) => {
    setSelecionados((atuais) => {
      const proximos = new Set(atuais);
      if (!proximos.delete(id)) proximos.add(id);
      return proximos;
    });
  }, []);
  const selecionarTodos = useCallback(
    (marcar: boolean) =>
      setSelecionados(new Set(marcar ? (dados?.pedidosEmAnalise ?? []).map((p) => p.id) : [])),
    [dados],
  );
  return { selecionados, setSelecionados, lote, alternarSelecao, selecionarTodos };
};

/** O pedido aberto na analise. Depois de uma observacao, vale a versao que a
 *  API devolveu ate a ficha recarregar. */
const useAnaliseAberta = (dados: PainelDeAnaliseDeCredito | null, aoMudarPedidos: () => void) => {
  const [emAnalise, setEmAnalise] = useState<PedidoDeVenda | null>(null);
  const pedidoEmAnalise = useMemo(() => {
    if (!emAnalise) return null;
    const naFicha = dados?.pedidosEmAnalise.find((pedido) => pedido.id === emAnalise.id);
    return naFicha && naFicha.historico.length >= emAnalise.historico.length ? naFicha : emAnalise;
  }, [dados, emAnalise]);
  const observar = useCallback(
    async (texto: string) => {
      if (!emAnalise) return;
      setEmAnalise(await observarPedido(emAnalise.id, texto));
      aoMudarPedidos();
    },
    [emAnalise, aoMudarPedidos],
  );
  return { pedidoEmAnalise, abrirAnalise: setEmAnalise, observar };
};

/** O que acontece dentro da ficha: pedidos marcados, o pedido aberto na
 *  analise, a aprovacao em lote e o aviso do resultado. */
export const useFichaDoCliente = (
  dados: PainelDeAnaliseDeCredito | null,
  aoMudarPedidos: () => void,
) => {
  const selecao = useSelecao(dados);
  const analise = useAnaliseAberta(dados, aoMudarPedidos);
  const [liberando, setLiberando] = useState(false);
  const [resultado, setResultado] = useState<Resultado>(null);
  const { selecionados, setSelecionados } = selecao;
  const { abrirAnalise } = analise;

  const aoDecidir = useCallback(
    (decisao: ResultadoDaDecisao, acao: AcaoDeCredito) => {
      abrirAnalise(null);
      setSelecionados((atuais) => new Set([...atuais].filter((id) => id !== decisao.pedido.id)));
      setResultado({
        mensagem: MENSAGEM_DA_DECISAO[acao](decisao.pedido.numero),
        tom: acao === 'APROVAR' ? 'sucesso' : 'alerta',
      });
      aoMudarPedidos();
    },
    [abrirAnalise, setSelecionados, aoMudarPedidos],
  );

  const liberar = useCallback(
    async (justificativa: string | null) => {
      const ids = [...selecionados];
      if (ids.length === 0) return;
      setLiberando(true);
      try {
        setResultado(mensagemDaLiberacao(await liberarPedidos(ids, justificativa)));
        setSelecionados(new Set());
        aoMudarPedidos();
      } catch (erro) {
        const mensagem =
          erro instanceof Error ? erro.message : 'Não foi possível aprovar os pedidos.';
        setResultado({ mensagem, tom: 'alerta' });
      } finally {
        setLiberando(false);
      }
    },
    [selecionados, setSelecionados, aoMudarPedidos],
  );

  return {
    ...selecao,
    ...analise,
    aoDecidir,
    liberar,
    liberando,
    resultado,
    fecharResultado: () => setResultado(null),
  };
};
