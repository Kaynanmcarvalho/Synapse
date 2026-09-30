import { useCallback, useEffect, useState } from 'react';
import { listDfe, type DfeEntry } from './dfe.api';

/** Carrega a lista de notas e mantém qual está selecionada — isolado só
 *  para manter `useDfeWorkflow` sob o limite de linhas do lint. */
export function useNotasRecebidas() {
  const [entries, setEntries] = useState<DfeEntry[]>([]);
  const [selectedKey, setSelectedKey] = useState<string | null>(null);
  const [carregando, setCarregando] = useState(false);
  const [erroDaLista, setErroDaLista] = useState<string | null>(null);
  const selected = entries.find((entry) => entry.nota.chaveDeAcesso === selectedKey) ?? null;

  const refresh = useCallback(async () => {
    setCarregando(true);
    setErroDaLista(null);
    try {
      const next = await listDfe();
      setEntries(next.items);
      setSelectedKey((atual) => atual ?? next.items[0]?.nota.chaveDeAcesso ?? null);
    } catch (cause) {
      setErroDaLista(cause instanceof Error ? cause.message : 'Não foi possível carregar os DF-e');
    } finally {
      setCarregando(false);
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  return { entries, selectedKey, setSelectedKey, selected, carregando, erroDaLista, refresh };
}
