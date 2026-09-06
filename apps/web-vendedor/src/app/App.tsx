import { Card, CardHeader, CardTitle } from '@synapse/ui';

/** Fase 0: casca que compila e roda. As telas chegam nas fases seguintes. */
export function App() {
  return (
    <main className="flex min-h-full items-center justify-center p-8">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>Synapse — Vendedor</CardTitle>
          <span className="text-xs text-slate-500">v0.1.0</span>
        </CardHeader>
        <p className="text-sm text-slate-600 dark:text-slate-400">
          Portal do vendedor externo: carteira, pedidos e comissoes.
        </p>
      </Card>
    </main>
  );
}
