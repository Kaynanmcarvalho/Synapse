import { useEffect, useRef } from 'react';

/** Os atalhos do Ponto de Vendas e do PDV ("F3", "Ctrl+X", "Alt+N"). Escutam na
 *  captura, antes dos atalhos globais do menu: dentro da venda, Ctrl+D cancela
 *  a venda e F10 informa o cliente, em vez de abrir outra tela ou o menu. Com
 *  uma janela aberta por cima, `ativo` falso deixa as teclas para ela. */

export type MapaDeAtalhos = Readonly<Record<string, (() => void) | undefined>>;

export const nomeDaTecla = (
  evento: Pick<KeyboardEvent, 'key' | 'ctrlKey' | 'metaKey' | 'altKey' | 'shiftKey'>,
): string => {
  const tecla = evento.key.length === 1 ? evento.key.toUpperCase() : evento.key;
  return [
    evento.ctrlKey || evento.metaKey ? 'Ctrl' : null,
    evento.altKey ? 'Alt' : null,
    evento.shiftKey && tecla.length > 1 ? 'Shift' : null,
    tecla,
  ]
    .filter(Boolean)
    .join('+');
};

/** Ctrl+X com texto selecionado num campo é recortar, não limpar a venda. */
const recortandoTexto = (): boolean => {
  const ativo = document.activeElement;
  return (
    ativo instanceof HTMLInputElement &&
    ativo.selectionStart !== null &&
    ativo.selectionStart !== ativo.selectionEnd
  );
};

export const useAtalhosDaTela = (atalhos: MapaDeAtalhos, ativo: boolean): void => {
  const atual = useRef(atalhos);
  useEffect(() => {
    atual.current = atalhos;
  });

  useEffect(() => {
    if (!ativo) return undefined;
    const naTecla = (evento: KeyboardEvent) => {
      const nome = nomeDaTecla(evento);
      const acao = atual.current[nome];
      if (!acao) return;
      if (nome === 'Ctrl+X' && recortandoTexto()) return;
      evento.preventDefault();
      evento.stopPropagation();
      if (!evento.repeat) acao();
    };
    window.addEventListener('keydown', naTecla, true);
    return () => window.removeEventListener('keydown', naTecla, true);
  }, [ativo]);
};
