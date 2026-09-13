import '@fontsource-variable/inter/opsz.css';
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { App } from './app/App';
import './styles/index.css';

// A retaguarda e so modo claro (design system de fundo branco). Uma preferencia
// escura salva por uma versao anterior nao pode escurecer a tela.
document.documentElement.classList.remove('dark');
try {
  window.localStorage.removeItem('synapse.theme');
} catch {
  // localStorage bloqueado (modo privado): nao ha preferencia antiga para limpar.
}

const container = document.getElementById('root');
if (!container) throw new Error('Elemento #root nao encontrado no index.html');

createRoot(container).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
