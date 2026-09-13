import { type RefObject, useEffect, useRef } from 'react';

type Acoes = Readonly<Record<'F6' | 'F7' | 'F8' | 'Escape', () => void>>;

/** F6 Voltar, F7 Proximo, F8 Salvar e Esc Cancelar, como no Syndata. So valem com
 *  o foco no assistente e sem dialogo aberto: Esc na busca fecha a busca, nao a tela. */
export function useAtalhosDoAssistente(area: RefObject<HTMLElement | null>, acoes: Acoes) {
  const atuais = useRef(acoes);
  useEffect(() => {
    atuais.current = acoes;
  });
  useEffect(() => {
    const aoTeclar = (evento: KeyboardEvent) => {
      if (evento.repeat || evento.ctrlKey || evento.altKey || evento.metaKey) return;
      const acao = atuais.current[evento.key as keyof Acoes];
      if (!acao) return;
      const foco = document.activeElement;
      const noAssistente = !foco || foco === document.body || Boolean(area.current?.contains(foco));
      if (!noAssistente || document.querySelector('[role="dialog"]')) return;
      evento.preventDefault();
      acao();
    };
    document.addEventListener('keydown', aoTeclar);
    return () => document.removeEventListener('keydown', aoTeclar);
  }, [area]);
}
