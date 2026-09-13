import type { DetalheDaNota, DetalheDoPedido, DetalheDoTitulo } from '@synapse/types';
import { useEffect, useRef, useState } from 'react';
import { buscarDetalheDoPedido, buscarNota, buscarTitulo } from '../analise.api';
import { chaveDoDocumento, type Documento } from './navegacao';

export type DadosDoDocumento =
  | { readonly tipo: 'pedido'; readonly dados: DetalheDoPedido }
  | { readonly tipo: 'nota'; readonly dados: DetalheDaNota }
  | { readonly tipo: 'titulo'; readonly dados: DetalheDoTitulo };

export type EstadoDoDocumento =
  | { readonly status: 'carregando' }
  | { readonly status: 'erro'; readonly mensagem: string; readonly naoEncontrado: boolean }
  | { readonly status: 'pronto'; readonly documento: DadosDoDocumento };

const carregar = async (documento: Documento): Promise<DadosDoDocumento> => {
  if (documento.tipo === 'pedido')
    return { tipo: 'pedido', dados: await buscarDetalheDoPedido(documento.id) };
  if (documento.tipo === 'nota') return { tipo: 'nota', dados: await buscarNota(documento.id) };
  return { tipo: 'titulo', dados: await buscarTitulo(documento.id) };
};

/** Carrega o documento do topo do caminho. Voltar para um documento ja visto
 *  nao vai de novo ao servidor: o caminho inteiro fica guardado enquanto a
 *  janela estiver aberta. */
export const useDocumento = (documento: Documento | null): EstadoDoDocumento => {
  const cache = useRef(new Map<string, DadosDoDocumento>());
  const [estado, setEstado] = useState<EstadoDoDocumento>({ status: 'carregando' });

  useEffect(() => {
    if (!documento) return undefined;
    const chave = chaveDoDocumento(documento);
    const guardado = cache.current.get(chave);
    if (guardado) {
      setEstado({ status: 'pronto', documento: guardado });
      return undefined;
    }
    let vivo = true;
    setEstado({ status: 'carregando' });
    carregar(documento)
      .then((carregado) => {
        cache.current.set(chave, carregado);
        if (vivo) setEstado({ status: 'pronto', documento: carregado });
      })
      .catch((erro: unknown) => {
        const mensagem =
          erro instanceof Error ? erro.message : 'Não foi possível abrir o documento.';
        if (vivo)
          setEstado({
            status: 'erro',
            mensagem,
            naoEncontrado: /não encontrad|ainda não tem|404/i.test(mensagem),
          });
      });
    return () => {
      vivo = false;
    };
  }, [documento]);

  return estado;
};
