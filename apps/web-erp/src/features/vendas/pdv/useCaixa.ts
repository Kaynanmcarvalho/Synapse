import type { CashSession } from '@synapse/types';
import { useCallback, useEffect, useState } from 'react';
import { caixaAtual } from '../comum/vendas.api';

/** O caixa aberto do operador na filial: `undefined` enquanto carrega, `null`
 *  quando precisa abrir. Guarda o último fechamento para mostrar a diferença. */
export const useCaixa = (filialId: string | null) => {
  const [caixa, setCaixa] = useState<CashSession | null | undefined>(undefined);
  const [fechamento, setFechamento] = useState<CashSession | null>(null);
  const [erro, setErro] = useState<string | null>(null);

  const recarregar = useCallback(async () => {
    if (!filialId) return;
    try {
      setCaixa(await caixaAtual(filialId));
      setErro(null);
    } catch (falha: unknown) {
      setErro(falha instanceof Error ? falha.message : 'Não foi possível ler o caixa');
      setCaixa(null);
    }
  }, [filialId]);

  useEffect(() => {
    setCaixa(undefined);
    void recarregar();
  }, [recarregar]);

  const fechado = useCallback((resultado: CashSession) => {
    setFechamento(resultado);
    setCaixa(null);
  }, []);

  const aberto = useCallback((novo: CashSession) => {
    setFechamento(null);
    setCaixa(novo);
  }, []);

  return { caixa, setCaixa, fechamento, erro, recarregar, fechado, aberto };
};
