import { estaNoTopoDaPilha, registrarSobreposicao } from '@synapse/ui';
import { useEffect, useRef } from 'react';

/** Esc fecha o que esta por cima — e so ele.
 *
 *  Fase 6.3: `stopPropagation` sozinho nao bastava — ele nao impede outro
 *  listener no MESMO `document`, na MESMA fase de rodar tambem (so
 *  `stopImmediatePropagation` faria isso, e nenhum consumidor sabia se havia
 *  outro para poder chamar isso com seguranca). Duas sobreposicoes reais —
 *  a GavetaDoCliente aberta e um Dialogo de decisao por cima — fechavam as
 *  duas com um Esc so. Agora registra na pilha global de sobreposicoes
 *  (`@synapse/ui`, a mesma que Modal/Drawer ja usavam) e so fecha quando
 *  esta realmente no topo dela.
 *
 *  Fase 6.4: movido de `features/credit/ui` para cá — o hook nunca teve
 *  nenhuma dependência do domínio de crédito (só `@synapse/ui`), só morava
 *  ali por ter nascido junto do primeiro `Dialogo`. `features/credit/ui`
 *  reexporta a partir daqui para não quebrar os consumidores existentes. */
export const useEscParaFechar = (aoFechar: () => void, ativo = true): void => {
  const marca = useRef<symbol | null>(null);

  useEffect(() => {
    if (!ativo) return undefined;
    const { marca: minha, sair } = registrarSobreposicao();
    marca.current = minha;
    return () => {
      marca.current = null;
      sair();
    };
  }, [ativo]);

  useEffect(() => {
    if (!ativo) return undefined;
    const aoTeclar = (evento: KeyboardEvent) => {
      if (evento.key !== 'Escape') return;
      if (!marca.current || !estaNoTopoDaPilha(marca.current)) return;
      evento.stopPropagation();
      aoFechar();
    };
    document.addEventListener('keydown', aoTeclar, true);
    return () => document.removeEventListener('keydown', aoTeclar, true);
  }, [aoFechar, ativo]);
};
