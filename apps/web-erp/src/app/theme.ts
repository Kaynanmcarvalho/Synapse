export type Theme = 'light' | 'dark';

const STORAGE_KEY = 'synapse.theme';

const systemPrefersDark = (): boolean =>
  typeof window !== 'undefined' && window.matchMedia('(prefers-color-scheme: dark)').matches;

/** §60 "modo claro e escuro". Sem preferência salva, segue o sistema — a
 *  escolha explícita do usuário (o toggle) sempre vence depois disso. */
export function getStoredTheme(): Theme {
  try {
    const stored = window.localStorage.getItem(STORAGE_KEY);
    if (stored === 'light' || stored === 'dark') return stored;
  } catch {
    // localStorage pode estar bloqueado (modo privado); segue pro fallback.
  }
  return systemPrefersDark() ? 'dark' : 'light';
}

export function applyTheme(theme: Theme): void {
  document.documentElement.classList.toggle('dark', theme === 'dark');
  try {
    window.localStorage.setItem(STORAGE_KEY, theme);
  } catch {
    // Falha silenciosa: o tema ainda se aplica nesta sessão, só não persiste.
  }
}
