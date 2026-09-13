import { useCallback, useState } from 'react';

/** As janelas da tela: a fila, a ficha do cliente, a analise do pedido, o
 *  navegador de documentos (pedido, nota, titulo) e o cadastro completo. */
export type IdDaJanela = 'fila' | 'cliente' | 'analise' | 'documentos' | 'cadastro';

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
