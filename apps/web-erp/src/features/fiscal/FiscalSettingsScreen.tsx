import { useState } from 'react';
import type { FiscalEnvironment } from '@synapse/types';
import { FiscalEnvironmentBanner } from './FiscalEnvironmentBanner';

export function FiscalSettingsScreen() {
  const [environment, setEnvironment] = useState<FiscalEnvironment>('HOMOLOGACAO');
  const choose = (next: FiscalEnvironment) => {
    if (next !== 'PRODUCAO' || window.prompt('Digite ATIVAR PRODUCAO') === 'ATIVAR PRODUCAO')
      setEnvironment(next);
  };
  return (
    <main>
      <FiscalEnvironmentBanner environment={environment} />
      <section className="mx-auto max-w-3xl p-8">
        <h1 className="text-2xl font-bold">Configuração fiscal da empresa</h1>
        <label className="mt-6 block">
          Ambiente
          <select
            value={environment}
            onChange={(event) => choose(event.target.value as FiscalEnvironment)}
            className="ml-3 rounded border p-2"
          >
            <option>MOCK</option>
            <option>SANDBOX</option>
            <option>HOMOLOGACAO</option>
            <option>PRODUCAO</option>
          </select>
        </label>
        <p className="mt-4 text-sm text-slate-600">
          Certificado A1 e senha são enviados somente ao backend e armazenados criptografados. A
          interface recebe apenas referências opacas.
        </p>
      </section>
    </main>
  );
}
