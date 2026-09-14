import { useCallback, useEffect, useMemo, useState } from 'react';
import { copiarLinha, totalizar, type LinhaDaVenda } from './itens';

/** Os itens da venda em andamento e a linha escolhida na grade. O rascunho fica
 *  guardado neste navegador: recarregar a página no meio da venda não perde o
 *  que já foi lançado. */

const lerRascunho = (chave: string): LinhaDaVenda[] => {
  try {
    const guardado = window.localStorage.getItem(chave);
    const lido = guardado ? (JSON.parse(guardado) as unknown) : [];
    return Array.isArray(lido) ? (lido as LinhaDaVenda[]) : [];
  } catch {
    return [];
  }
};

export const useVendaEmAndamento = (chaveDoRascunho: string) => {
  const [linhas, setLinhas] = useState<LinhaDaVenda[]>(() => lerRascunho(chaveDoRascunho));
  const [selecionada, setSelecionada] = useState<string | null>(null);

  useEffect(() => {
    try {
      if (linhas.length) window.localStorage.setItem(chaveDoRascunho, JSON.stringify(linhas));
      else window.localStorage.removeItem(chaveDoRascunho);
    } catch {
      // Sem armazenamento o rascunho vale só enquanto a tela está aberta.
    }
  }, [chaveDoRascunho, linhas]);

  const lancar = useCallback((linha: LinhaDaVenda, substituir: string | null) => {
    setLinhas((atuais) =>
      substituir && atuais.some((item) => item.chave === substituir)
        ? atuais.map((item) => (item.chave === substituir ? { ...linha, chave: substituir } : item))
        : [...atuais, linha],
    );
    setSelecionada(substituir ?? linha.chave);
  }, []);

  const excluir = useCallback((chave: string) => {
    setLinhas((atuais) => {
      const indice = atuais.findIndex((item) => item.chave === chave);
      const restantes = atuais.filter((item) => item.chave !== chave);
      setSelecionada(restantes[Math.min(indice, restantes.length - 1)]?.chave ?? null);
      return restantes;
    });
  }, []);

  const copiar = useCallback((chave: string) => {
    setLinhas((atuais) => {
      const original = atuais.find((item) => item.chave === chave);
      if (!original) return atuais;
      const copia = copiarLinha(original);
      setSelecionada(copia.chave);
      return [...atuais, copia];
    });
  }, []);

  const atualizar = useCallback((chave: string, parcial: Partial<LinhaDaVenda>) => {
    setLinhas((atuais) =>
      atuais.map((item) => (item.chave === chave ? { ...item, ...parcial, chave } : item)),
    );
  }, []);

  const substituirTodas = useCallback((novas: readonly LinhaDaVenda[]) => {
    setLinhas([...novas]);
    setSelecionada((atual) => (novas.some((item) => item.chave === atual) ? atual : null));
  }, []);

  const limpar = useCallback(() => {
    setLinhas([]);
    setSelecionada(null);
  }, []);

  const totais = useMemo(() => totalizar(linhas), [linhas]);
  const linhaSelecionada = linhas.find((item) => item.chave === selecionada) ?? null;

  return {
    linhas,
    totais,
    selecionada,
    linhaSelecionada,
    setSelecionada,
    lancar,
    excluir,
    copiar,
    atualizar,
    substituirTodas,
    limpar,
  };
};

export type VendaEmAndamento = ReturnType<typeof useVendaEmAndamento>;
