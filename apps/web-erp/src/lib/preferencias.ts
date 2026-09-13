import { useCallback, useState } from 'react';
import { currentUid } from './dev-auth';

/** Preferencias de tela guardadas por usuario: posicao e tamanho de janela,
 *  ordem e visibilidade de coluna, ordenacao escolhida.
 *
 *  A chave leva o uid: dois usuarios no mesmo computador nao herdam o layout um
 *  do outro. Ficam no navegador — e preferencia de uso, nao dado do negocio —,
 *  entao nunca podem derrubar a tela se o armazenamento estiver bloqueado. */

const RAIZ = 'synapse.preferencias';

const chave = (nome: string): string => `${RAIZ}.${currentUid() ?? 'anonimo'}.${nome}`;

export const lerPreferencia = <T extends object>(nome: string, padrao: T): T => {
  try {
    const bruto = window.localStorage.getItem(chave(nome));
    if (!bruto) return padrao;
    const guardado = JSON.parse(bruto) as Partial<T>;
    // Mescla com o padrao: preferencia antiga nao quebra quando um campo novo
    // aparece na tela.
    return { ...padrao, ...guardado };
  } catch {
    return padrao;
  }
};

export const gravarPreferencia = <T extends object>(nome: string, valor: T): void => {
  try {
    window.localStorage.setItem(chave(nome), JSON.stringify(valor));
  } catch {
    // Janela anonima ou armazenamento cheio: a tela continua funcionando.
  }
};

export const esquecerPreferencia = (nome: string): void => {
  try {
    window.localStorage.removeItem(chave(nome));
  } catch {
    // idem
  }
};

/** Estado que se lembra sozinho. Usa a mesma assinatura do `useState`. */
export const usePreferencia = <T extends object>(
  nome: string,
  padrao: T,
): readonly [T, (valor: T | ((atual: T) => T)) => void] => {
  const [valor, setValor] = useState<T>(() => lerPreferencia(nome, padrao));

  const guardar = useCallback(
    (proximo: T | ((atual: T) => T)) =>
      setValor((atual) => {
        const novo = typeof proximo === 'function' ? proximo(atual) : proximo;
        gravarPreferencia(nome, novo);
        return novo;
      }),
    [nome],
  );

  return [valor, guardar] as const;
};
