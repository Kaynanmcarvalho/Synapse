import { useEffect } from 'react';

/** Os atalhos do sistema antigo, porque a mão de quem digita já sabe: F2 salva
 *  e F3 desfaz o que foi digitado. O Esc é do próprio Modal. */
export const useAtalhosDoCadastro = (salvar: () => void, limpar: () => void) => {
  useEffect(() => {
    const naTecla = (evento: KeyboardEvent) => {
      if (evento.key === 'F2') {
        evento.preventDefault();
        salvar();
      }
      if (evento.key === 'F3') {
        evento.preventDefault();
        limpar();
      }
    };
    window.addEventListener('keydown', naTecla);
    return () => window.removeEventListener('keydown', naTecla);
  }, [salvar, limpar]);
};
