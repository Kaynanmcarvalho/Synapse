import { useCallback, useMemo } from 'react';
import { usePreferencia } from '../../../lib/preferencias';
import {
  alternarColuna,
  larguraPadrao,
  limitarLargura,
  moverColuna,
  ORDEM_PADRAO,
  ORDENACAO_PADRAO,
  proximaOrdenacao,
  TODAS_AS_COLUNAS,
  type IdDaColuna,
  type Ordenacao,
} from './colunas';

interface PreferenciasDaFila {
  readonly ordem: readonly IdDaColuna[];
  readonly ordenacao: Ordenacao;
  /** So as colunas que o usuario arrastou; o resto usa a largura de fabrica. */
  readonly larguras: Partial<Record<IdDaColuna, number>>;
}

const PADRAO: PreferenciasDaFila = {
  ordem: ORDEM_PADRAO,
  ordenacao: ORDENACAO_PADRAO,
  larguras: {},
};

/** Ordem, largura das colunas e criterio de ordenacao, guardados por usuario.
 *  Se uma coluna deixar de existir numa versao nova, a preferencia antiga e
 *  ignorada em vez de quebrar a tabela. */
export const usePreferenciasDaFila = () => {
  const [guardadas, gravar] = usePreferencia<PreferenciasDaFila>('fila-de-pedidos', PADRAO);

  const ordem = useMemo(() => {
    const validas = guardadas.ordem.filter((id) => TODAS_AS_COLUNAS.includes(id));
    return validas.length > 0 ? validas : ORDEM_PADRAO;
  }, [guardadas.ordem]);

  const ordenacao = TODAS_AS_COLUNAS.includes(guardadas.ordenacao.coluna)
    ? guardadas.ordenacao
    : ORDENACAO_PADRAO;

  const largura = useCallback(
    (coluna: IdDaColuna) => guardadas.larguras?.[coluna] ?? larguraPadrao(coluna),
    [guardadas.larguras],
  );

  const ordenarPor = useCallback(
    (coluna: IdDaColuna) =>
      gravar((atual) => ({ ...atual, ordenacao: proximaOrdenacao(atual.ordenacao, coluna) })),
    [gravar],
  );

  const mover = useCallback(
    (arrastada: IdDaColuna, alvo: IdDaColuna) =>
      gravar((atual) => ({ ...atual, ordem: moverColuna(atual.ordem, arrastada, alvo) })),
    [gravar],
  );

  const alternar = useCallback(
    (coluna: IdDaColuna) =>
      gravar((atual) => ({ ...atual, ordem: alternarColuna(atual.ordem, coluna) })),
    [gravar],
  );

  const redimensionar = useCallback(
    (coluna: IdDaColuna, nova: number) =>
      gravar((atual) => ({
        ...atual,
        larguras: { ...atual.larguras, [coluna]: limitarLargura(nova) },
      })),
    [gravar],
  );

  /** Dois cliques na divisao: a coluna volta ao tamanho de fabrica. */
  const restaurarLargura = useCallback(
    (coluna: IdDaColuna) =>
      gravar((atual) => {
        const larguras = { ...atual.larguras };
        delete larguras[coluna];
        return { ...atual, larguras };
      }),
    [gravar],
  );

  const restaurar = useCallback(() => gravar(PADRAO), [gravar]);

  return {
    ordem,
    ordenacao,
    largura,
    ordenarPor,
    mover,
    alternar,
    redimensionar,
    restaurarLargura,
    restaurar,
  };
};
