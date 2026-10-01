import type { NfceSeriesAssignment } from '@synapse/types';
import { useEffect, useRef, useState } from 'react';

/** Peças sem JSX do controle de séries da NFC-e (Fase 7.5). */

/** Controle integrado à grade: em repouso não desenha caixa (só o texto na
 *  linha); hover mostra a linha fina; foco ganha a borda e o halo cobalto do
 *  SDL. Densidade compacta (32px) do próprio SDL — o 36px global não muda. */
export const INTEGRADO =
  'border-transparent bg-transparent hover:border-line-fina hover:bg-surface-painel focus:bg-surface-painel';

export type CampoDaSerie = 'identifier' | 'series' | 'nextNumber';

export const nomeDoDispositivo = (): string => {
  const agente = navigator.userAgent;
  const sistema = ['Windows', 'Android', 'iPhone', 'Mac', 'Linux'].find((nome) =>
    agente.includes(nome),
  );
  return `Web ERP${sistema ? ` — ${sistema === 'Mac' ? 'macOS' : sistema}` : ''}`;
};

export const novaLinha = (parcial: Partial<NfceSeriesAssignment>): NfceSeriesAssignment => ({
  id: crypto.randomUUID(),
  identifier: '',
  system: 'RETAGUARDA',
  name: '',
  series: 1,
  nextNumber: 1,
  ...parcial,
});

/** Para onde o foco vai depois de mudar a coleção — sem isso, adicionar
 *  deixava o foco no botão e remover o jogava no `<body>`. */
export type AlvoDeFoco =
  | { readonly tipo: 'linha'; readonly id: string; readonly campo: 'identificador' | 'nome' }
  | { readonly tipo: 'adicionar' };

/** Coluna (1-based, contando a coluna "Linha") de cada campo focável. */
const COLUNA: Readonly<Record<'identificador' | 'nome', number>> = { identificador: 2, nome: 4 };

export const useFocoDaColecao = (series: readonly NfceSeriesAssignment[]) => {
  const corpo = useRef<HTMLTableSectionElement>(null);
  const adicionar = useRef<HTMLButtonElement>(null);
  const [alvo, setAlvo] = useState<AlvoDeFoco | null>(null);
  useEffect(() => {
    if (!alvo) return;
    if (alvo.tipo === 'adicionar') adicionar.current?.focus();
    else
      corpo.current
        ?.querySelector<HTMLInputElement>(
          `[data-linha="${alvo.id}"] td:nth-child(${COLUNA[alvo.campo]}) input`,
        )
        ?.focus();
    setAlvo(null);
  }, [alvo, series]);
  return { corpo, adicionar, focar: setAlvo };
};

/** "Já deixou este campo" — só para não pintar de vermelho a linha que
 *  acabou de nascer vazia. Estado de interface, não de dado. */
export const useCamposTocados = () => {
  const [tocados, setTocados] = useState<ReadonlySet<string>>(() => new Set());
  return {
    tocado: (id: string, campo: CampoDaSerie) => tocados.has(`${id}:${campo}`),
    tocar: (id: string, campo: CampoDaSerie) =>
      setTocados((atual) =>
        atual.has(`${id}:${campo}`) ? atual : new Set(atual).add(`${id}:${campo}`),
      ),
  };
};
