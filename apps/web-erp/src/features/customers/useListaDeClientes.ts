import type { ClienteNaLista } from '@synapse/types';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { listarClientes, type FiltrosDaLista } from './clientes.api';

/** A lista da tela de clientes: espera a digitação parar, busca e pagina.
 *  Uma consulta por tecla castigaria o banco sem ninguém ganhar nada. */

export type EstadoDaLista =
  | { readonly status: 'carregando' }
  | { readonly status: 'erro'; readonly mensagem: string }
  | {
      readonly status: 'pronto';
      readonly itens: readonly ClienteNaLista[];
      readonly proximoCursor: string | null;
    };

export interface FiltrosDaTela {
  readonly termo: string;
  readonly situacao: FiltrosDaLista['situacao'] | '';
  readonly ativo: '' | 'ativos' | 'inativos';
}

const ESPERA_DA_DIGITACAO_MS = 350;

export const useListaDeClientes = (filtros: FiltrosDaTela) => {
  const [busca, setBusca] = useState(filtros.termo);
  const [estado, setEstado] = useState<EstadoDaLista>({ status: 'carregando' });

  useEffect(() => {
    const relogio = setTimeout(() => setBusca(filtros.termo), ESPERA_DA_DIGITACAO_MS);
    return () => clearTimeout(relogio);
  }, [filtros.termo]);

  const consulta = useMemo<FiltrosDaLista>(
    () => ({
      ...(busca.trim() ? { termo: busca.trim() } : {}),
      ...(filtros.situacao ? { situacao: filtros.situacao } : {}),
      ...(filtros.ativo ? { ativo: filtros.ativo } : {}),
      limite: 50,
    }),
    [busca, filtros.situacao, filtros.ativo],
  );

  const carregar = useCallback(async () => {
    setEstado({ status: 'carregando' });
    try {
      const pagina = await listarClientes(consulta);
      setEstado({ status: 'pronto', itens: pagina.itens, proximoCursor: pagina.proximoCursor });
    } catch (erro: unknown) {
      setEstado({
        status: 'erro',
        mensagem: erro instanceof Error ? erro.message : 'Não foi possível carregar os clientes.',
      });
    }
  }, [consulta]);

  useEffect(() => {
    void carregar();
  }, [carregar]);

  const carregarMais = useCallback(async () => {
    if (estado.status !== 'pronto' || !estado.proximoCursor) return;
    const pagina = await listarClientes({ ...consulta, cursor: estado.proximoCursor });
    setEstado({
      status: 'pronto',
      itens: [...estado.itens, ...pagina.itens],
      proximoCursor: pagina.proximoCursor,
    });
  }, [consulta, estado]);

  return { estado, busca, carregar, carregarMais };
};
