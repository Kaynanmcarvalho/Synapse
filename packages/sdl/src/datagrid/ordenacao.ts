import { useCallback, useState } from 'react';
import type { Direcao, Ordenacao } from './tipos';

/** Dois cliques na mesma coluna invertem a direção; numa coluna diferente,
 *  a ordenação começa crescente. Regra provada em `credit/fila/colunas.ts`;
 *  aqui vira utilitário genérico, para quem ainda não tem estado próprio. */
export const proximaOrdenacao = <TId extends string>(
  atual: Ordenacao<TId> | null,
  coluna: TId,
): Ordenacao<TId> =>
  atual?.coluna === coluna
    ? { coluna, direcao: (atual.direcao === 'asc' ? 'desc' : 'asc') as Direcao }
    : { coluna, direcao: 'asc' };

/** Ordenação client-side sem persistência: útil para grids simples que ainda
 *  não precisam lembrar a escolha do usuário. Quem precisa persistir (a fila
 *  de crédito, hoje) continua com o próprio hook — a regra de ciclo é a
 *  mesma, só o armazenamento muda. */
export function useOrdenacaoLocal<TId extends string>(padrao: Ordenacao<TId> | null = null) {
  const [ordenacao, setOrdenacao] = useState<Ordenacao<TId> | null>(padrao);
  const ordenarPor = useCallback((coluna: TId) => {
    setOrdenacao((atual) => proximaOrdenacao(atual, coluna));
  }, []);
  return { ordenacao, ordenarPor } as const;
}
