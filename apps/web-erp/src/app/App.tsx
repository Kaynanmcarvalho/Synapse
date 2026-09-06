import { useState } from 'react';
import { ProductsScreen } from '../features/products/ProductsScreen';
import { PosScreen } from '../features/pos/PosScreen';

/** Sem roteador ainda (chega numa fase seguinte) — troca simples por aba,
 *  so para as telas terem onde aparecer enquanto sao construidas. */
const SCREENS = { pos: PosScreen, produtos: ProductsScreen } as const;

export function App() {
  const [screen, setScreen] = useState<keyof typeof SCREENS>('produtos');
  const Screen = SCREENS[screen];

  return (
    <div className="min-h-full">
      <nav className="flex gap-1 border-b border-slate-200 bg-white px-4 py-2 dark:border-slate-800 dark:bg-slate-900">
        {(Object.keys(SCREENS) as Array<keyof typeof SCREENS>).map((key) => (
          <button
            key={key}
            type="button"
            onClick={() => setScreen(key)}
            className={`rounded px-3 py-1.5 text-sm font-medium capitalize ${
              screen === key
                ? 'bg-brand-600 text-white'
                : 'text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800'
            }`}
          >
            {key}
          </button>
        ))}
      </nav>
      <Screen />
    </div>
  );
}
