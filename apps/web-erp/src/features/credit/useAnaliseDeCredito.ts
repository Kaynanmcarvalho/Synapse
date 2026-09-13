import type { PainelDeAnaliseDeCredito, PedidoNaFila } from '@synapse/types';
import { useCallback, useEffect, useState } from 'react';
import { carregarPainelDoCliente, listarFilaDeAnalise } from './analise.api';

export type EstadoDaFila =
  | { readonly status: 'carregando' }
  | { readonly status: 'erro'; readonly mensagem: string }
  | { readonly status: 'pronto'; readonly pedidos: readonly PedidoNaFila[] };

export type EstadoDoPainel =
  | { readonly status: 'vazio' }
  | { readonly status: 'carregando' }
  | { readonly status: 'erro'; readonly mensagem: string }
  | { readonly status: 'pronto'; readonly dados: PainelDeAnaliseDeCredito };

const mensagemDe = (erro: unknown): string =>
  erro instanceof Error ? erro.message : 'Não foi possível falar com o servidor do Synapse.';

/** A fila e a ficha do cliente carregam separadas: trocar de cliente nao pode
 *  apagar a fila que o analista acabou de ler. */
export const useAnaliseDeCredito = () => {
  const [fila, setFila] = useState<EstadoDaFila>({ status: 'carregando' });
  const [painel, setPainel] = useState<EstadoDoPainel>({ status: 'vazio' });

  const carregarFila = useCallback(async () => {
    setFila({ status: 'carregando' });
    try {
      setFila({ status: 'pronto', pedidos: await listarFilaDeAnalise() });
    } catch (erro) {
      setFila({ status: 'erro', mensagem: mensagemDe(erro) });
    }
  }, []);

  const abrirCliente = useCallback(async (customerId: string) => {
    setPainel({ status: 'carregando' });
    try {
      setPainel({ status: 'pronto', dados: await carregarPainelDoCliente(customerId) });
    } catch (erro) {
      setPainel({ status: 'erro', mensagem: mensagemDe(erro) });
    }
  }, []);

  useEffect(() => {
    void carregarFila();
  }, [carregarFila]);

  return { fila, painel, carregarFila, abrirCliente };
};
