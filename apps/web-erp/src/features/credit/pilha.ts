import { useCallback, useState } from 'react';

export type IdDaJanela = 'fila' | 'cliente' | 'pedido' | 'parcelas' | 'cadastro';

/** O que cada janela precisa saber da pilha: a profundidade, se esta na frente
 *  e como se fechar ou subir. */
export interface Pilha {
  readonly zIndex: number;
  readonly ativa: boolean;
  readonly aoFechar: () => void;
  readonly aoFocar: () => void;
}

/** A ordem das janelas e a profundidade: a ultima da lista fica na frente. */
export const usePilha = () => {
  const [ordem, setOrdem] = useState<readonly IdDaJanela[]>(['fila']);

  const focar = useCallback(
    (id: IdDaJanela) => setOrdem((atual) => [...atual.filter((outro) => outro !== id), id]),
    [],
  );

  const fechar = useCallback(
    (...ids: IdDaJanela[]) => setOrdem((atual) => atual.filter((outro) => !ids.includes(outro))),
    [],
  );

  const pilha = (id: IdDaJanela): Pilha => ({
    zIndex: 40 + Math.max(0, ordem.indexOf(id)),
    ativa: ordem.at(-1) === id,
    aoFechar: () => fechar(id),
    aoFocar: () => focar(id),
  });

  const aberta = (id: IdDaJanela): boolean => ordem.includes(id);

  return { ordem, focar, fechar, pilha, aberta };
};

export type ControleDaPilha = ReturnType<typeof usePilha>;
