import { useCallback, useMemo } from 'react';
import { usePreferencia } from '../../../lib/preferencias';
import {
  alternarColuna,
  incluirColunasNovas,
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

/** Versao das preferencias: a 2 trouxe motivo, tempo aguardando e exposicao. */
const VERSAO = 2;

interface PreferenciasDaFila {
  readonly versao?: number;
  readonly ordem: readonly IdDaColuna[];
  readonly ordenacao: Ordenacao;
  /** So as colunas que o usuario arrastou; o resto usa a largura de fabrica. */
  readonly larguras: Partial<Record<IdDaColuna, number>>;
}

const PADRAO: PreferenciasDaFila = {
  versao: VERSAO,
  ordem: ORDEM_PADRAO,
  ordenacao: ORDENACAO_PADRAO,
  larguras: {},
};

/** Ordem, largura das colunas e criterio de ordenacao, guardados por usuario.
 *  Se uma coluna deixar de existir numa versao nova, a preferencia antiga e
 *  ignorada em vez de quebrar a tabela. */
export const usePreferenciasDaFila = () => {
  const [guardadas, gravarCru] = usePreferencia<PreferenciasDaFila>('fila-de-pedidos', PADRAO);

  /** Quem vem de uma versao antiga recebe as colunas novas uma vez; a partir
   *  da primeira alteracao, a preferencia ja fica na versao atual. */
  const atualizar = useCallback(
    (atual: PreferenciasDaFila): PreferenciasDaFila =>
      atual.versao === VERSAO
        ? atual
        : { ...atual, versao: VERSAO, ordem: incluirColunasNovas(atual.ordem) },
    [],
  );
  const gravar = useCallback(
    (mudanca: (atual: PreferenciasDaFila) => PreferenciasDaFila) =>
      gravarCru((atual) => mudanca(atualizar(atual))),
    [gravarCru, atualizar],
  );

  const ordem = useMemo(() => {
    const vigente = atualizar(guardadas).ordem;
    const validas = vigente.filter((id) => TODAS_AS_COLUNAS.includes(id));
    return validas.length > 0 ? validas : ORDEM_PADRAO;
  }, [guardadas, atualizar]);

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

  const restaurar = useCallback(() => gravarCru(PADRAO), [gravarCru]);

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
