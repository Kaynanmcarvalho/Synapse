import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { App } from './app/App';
import { applyTheme, getStoredTheme } from './app/theme';
import './styles/index.css';

// Aplica antes do primeiro paint do React: evita o flash de tema errado
// que apareceria se o toggle só rodasse depois do AppShell montar.
applyTheme(getStoredTheme());

const container = document.getElementById('root');
if (!container) throw new Error('Elemento #root nao encontrado no index.html');

createRoot(container).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
