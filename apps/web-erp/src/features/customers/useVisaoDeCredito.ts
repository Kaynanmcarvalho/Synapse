import type { PainelDeAnaliseDeCredito } from '@synapse/types';
import { useEffect, useState } from 'react';
import { apiRequest } from '../../lib/dev-auth';

/** O que o resto do sistema já sabe sobre este cliente: limite comprometido,
 *  pedidos em análise, notas emitidas e títulos. Vem da análise de crédito —
 *  a mesma fonte da tela de crédito, sem recalcular nada aqui.
 *
 *  Quem só tem permissão de cadastro não enxerga financeiro: nesse caso a aba
 *  diz isso, em vez de mostrar um painel vazio. */

export type VisaoDeCredito =
  | { readonly status: 'novo' }
  | { readonly status: 'carregando' }
  | { readonly status: 'pronto'; readonly painel: PainelDeAnaliseDeCredito }
  | { readonly status: 'sem-permissao' }
  | { readonly status: 'erro'; readonly mensagem: string };

const semPermissao = (erro: unknown): boolean =>
  erro instanceof Error && /permiss/i.test(erro.message);

export const useVisaoDeCredito = (customerId: string | null): VisaoDeCredito => {
  const [visao, setVisao] = useState<VisaoDeCredito>(
    customerId ? { status: 'carregando' } : { status: 'novo' },
  );

  useEffect(() => {
    if (!customerId) {
      setVisao({ status: 'novo' });
      return;
    }
    let ativo = true;
    setVisao({ status: 'carregando' });
    apiRequest<PainelDeAnaliseDeCredito>(`/credit-analysis/customers/${customerId}?limit=20`)
      .then((painel) => ativo && setVisao({ status: 'pronto', painel }))
      .catch((erro: unknown) => {
        if (!ativo) return;
        setVisao(
          semPermissao(erro)
            ? { status: 'sem-permissao' }
            : {
                status: 'erro',
                mensagem: erro instanceof Error ? erro.message : 'Não foi possível carregar.',
              },
        );
      });
    return () => {
      ativo = false;
    };
  }, [customerId]);

  return visao;
};
