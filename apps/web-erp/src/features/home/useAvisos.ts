import { useCallback, useEffect, useState } from 'react';
import { ROTAS } from '../../app/rotas';
import { listarFilaDeAnalise } from '../credit/analise.api';
import { apiRequest } from '../../lib/dev-auth';
import {
  avisoDeCreditoFila,
  avisoDeLotes,
  avisoDeMdfe,
  avisosDoPainel,
  ordenarAvisos,
  type Aviso,
  type LoteVencendo,
  type ResumoDoPainel,
} from './avisos';

export type EstadoDosAvisos =
  | { readonly status: 'carregando' }
  | { readonly status: 'erro' }
  | {
      readonly status: 'pronto';
      readonly avisos: readonly Aviso[];
      readonly calculando: boolean;
      /** Pelo menos uma fonte falhou, mas nao todas — o que se sabe aparece,
       *  e isso avisa que a lista pode estar incompleta sem parecer que o
       *  ERP inteiro caiu (§30 da Fase 4). */
      readonly algoIndisponivel: boolean;
    };

/** Data de hoje no fuso do navegador — `toISOString` sozinho daria o dia de
 *  Greenwich, que depois das 21h no Brasil ja e amanha. */
const dataLocal = (data: Date): string =>
  new Date(data.getTime() - data.getTimezoneOffset() * 60_000).toISOString().slice(0, 10);

export const useAvisos = (caminhoDoMdfe: string) => {
  const [estado, setEstado] = useState<EstadoDosAvisos>({ status: 'carregando' });

  const carregar = useCallback(async () => {
    setEstado({ status: 'carregando' });
    const hoje = dataLocal(new Date());
    const [painel, lotes, mdfe, credito] = await Promise.allSettled([
      apiRequest<ResumoDoPainel>(
        `/analytics/dashboard?from=${hoje.slice(0, 8)}01&to=${hoje}&profile=admin`,
      ),
      apiRequest<{ items: LoteVencendo[] }>('/inventory/lots/expiry-alerts?limit=50'),
      apiRequest<unknown[]>('/fiscal/mdfe/alerts'),
      listarFilaDeAnalise(),
    ]);
    const fontes = [painel, lotes, mdfe, credito];

    // Cada fonte falha sozinha: sem permissao, ou com o modulo desligado, o aviso
    // dela so nao aparece. A tela so mostra erro quando nenhuma respondeu.
    if (fontes.every((resultado) => resultado.status === 'rejected')) {
      setEstado({ status: 'erro' });
      return;
    }

    const avisos: Aviso[] = [];
    if (painel.status === 'fulfilled') {
      avisos.push(
        ...avisosDoPainel(painel.value, { receber: ROTAS.boletos, estoque: ROTAS.estoque }),
      );
    }
    const deLotes =
      lotes.status === 'fulfilled' ? avisoDeLotes(lotes.value.items, ROTAS.estoque) : null;
    const deMdfe = mdfe.status === 'fulfilled' ? avisoDeMdfe(mdfe.value, caminhoDoMdfe) : null;
    const deCredito =
      credito.status === 'fulfilled'
        ? avisoDeCreditoFila(credito.value, ROTAS.analiseDeCredito)
        : null;
    if (deLotes) avisos.push(deLotes);
    if (deMdfe) avisos.push(deMdfe);
    if (deCredito) avisos.push(deCredito);

    setEstado({
      status: 'pronto',
      avisos: ordenarAvisos(avisos),
      calculando: painel.status === 'fulfilled' && !painel.value.ready,
      algoIndisponivel: fontes.some((resultado) => resultado.status === 'rejected'),
    });
  }, [caminhoDoMdfe]);

  useEffect(() => {
    void carregar();
  }, [carregar]);

  return { estado, recarregar: carregar };
};
