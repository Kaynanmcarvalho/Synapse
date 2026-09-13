import type { AcaoDeCredito, ResultadoDaDecisao } from '@synapse/types';
import { useCallback, useState } from 'react';
import { decidirPedido } from '../analise.api';

/** A decisao em andamento: qual acao o analista escolheu, o envio e o erro que
 *  a API devolver (fora da politica, sem permissao, pedido ja decidido). */
export const useDecisao = (
  pedidoId: string,
  aoDecidir: (resultado: ResultadoDaDecisao, acao: AcaoDeCredito) => void,
) => {
  const [acao, setAcao] = useState<AcaoDeCredito | null>(null);
  const [enviando, setEnviando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  const abrir = useCallback((escolhida: AcaoDeCredito) => {
    setErro(null);
    setAcao(escolhida);
  }, []);

  const fechar = useCallback(() => {
    setAcao(null);
    setErro(null);
  }, []);

  const confirmar = useCallback(
    async (justificativa: string) => {
      if (!acao) return;
      setEnviando(true);
      setErro(null);
      try {
        const resultado = await decidirPedido(pedidoId, acao, justificativa.trim() || null);
        setAcao(null);
        aoDecidir(resultado, acao);
      } catch (causa) {
        setErro(causa instanceof Error ? causa.message : 'Não foi possível registrar a decisão.');
      } finally {
        setEnviando(false);
      }
    },
    [acao, pedidoId, aoDecidir],
  );

  return { acao, abrir, fechar, confirmar, enviando, erro };
};
