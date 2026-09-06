import type { FiscalEnvironment } from '@synapse/types';

export function FiscalEnvironmentBanner({ environment }: { environment: FiscalEnvironment }) {
  const production = environment === 'PRODUCAO';
  return (
    <div
      role="status"
      className={`sticky top-0 z-50 px-4 py-2 text-center font-bold ${production ? 'bg-red-700 text-white' : 'bg-amber-300 text-amber-950'}`}
    >
      Ambiente fiscal: {environment}
      {production ? ' — documentos com validade fiscal' : ' — sem validade fiscal'}
    </div>
  );
}
