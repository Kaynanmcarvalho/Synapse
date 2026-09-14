import { useCallback, useEffect, useState } from 'react';
import { listarFiliais, type Filial } from './vendas.api';

/** A filial em que o balcão ou o caixa está. Fica lembrada neste computador;
 *  na primeira vez vale a matriz. */

const CHAVE = 'synapse:pos:branchId';

const lerGuardada = (): string | null => {
  try {
    return window.localStorage.getItem(CHAVE);
  } catch {
    return null;
  }
};

export const useFilial = () => {
  const [filiais, setFiliais] = useState<readonly Filial[] | null>(null);
  const [filialId, setFilialId] = useState<string | null>(lerGuardada);
  const [erro, setErro] = useState<string | null>(null);

  useEffect(() => {
    let vivo = true;
    listarFiliais()
      .then((lista) => {
        if (!vivo) return;
        setFiliais(lista);
        setFilialId((atual) =>
          atual && lista.some((filial) => filial.id === atual)
            ? atual
            : ((lista.find((filial) => filial.isHeadquarters) ?? lista[0])?.id ?? null),
        );
      })
      .catch((falha: unknown) => {
        if (!vivo) return;
        setErro(falha instanceof Error ? falha.message : 'Não foi possível carregar as filiais');
        setFiliais([]);
      });
    return () => {
      vivo = false;
    };
  }, []);

  const escolher = useCallback((id: string) => {
    try {
      window.localStorage.setItem(CHAVE, id);
    } catch {
      // Sem armazenamento, a escolha vale até fechar a aba.
    }
    setFilialId(id);
  }, []);

  const filial = filiais?.find((item) => item.id === filialId) ?? null;
  return { filiais, filial, filialId: filial?.id ?? null, escolher, erro };
};
