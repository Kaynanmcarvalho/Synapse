import { useEffect, useState } from 'react';

/** Um estado que fica guardado neste navegador: sair da tela no meio da venda
 *  e voltar traz o cliente e a mesa de volta. Sem armazenamento, vale só
 *  enquanto a tela está aberta. */
export const useGuardado = <T>(chave: string, inicial: T) => {
  const [valor, setValor] = useState<T>(() => {
    try {
      const guardado = window.localStorage.getItem(chave);
      return guardado === null ? inicial : (JSON.parse(guardado) as T);
    } catch {
      return inicial;
    }
  });

  useEffect(() => {
    try {
      window.localStorage.setItem(chave, JSON.stringify(valor));
    } catch {
      // Sem armazenamento, o valor vale só nesta tela.
    }
  }, [chave, valor]);

  return [valor, setValor] as const;
};
