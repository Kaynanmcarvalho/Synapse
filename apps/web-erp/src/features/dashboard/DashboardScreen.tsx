import { Divider, Text } from '@synapse/sdl';
import { useEffect, useState } from 'react';
import { apiRequest } from '../../lib/dev-auth';
import { ResultadosDaConsulta } from './DashboardSecoes';
import type { Dashboard } from './dashboard.types';
import { montarCards } from './dashboard.util';
import { FiltrosDoPainel } from './FiltrosDoPainel';

export function DashboardScreen() {
  const [profile, setProfile] = useState('admin');
  const [from, setFrom] = useState(() => new Date().toISOString().slice(0, 8) + '01');
  const [to, setTo] = useState(() => new Date().toISOString().slice(0, 10));
  const [branchId, setBranchId] = useState('');
  const [sellerId, setSellerId] = useState('');
  const [data, setData] = useState<Dashboard | null>(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const load = async () => {
    setLoading(true);
    setError('');
    setData(null);
    try {
      const query = new URLSearchParams({ from, to, profile });
      if (branchId.trim()) query.set('branchId', branchId.trim());
      if (sellerId.trim() && profile !== 'seller') query.set('sellerId', sellerId.trim());
      setData(await apiRequest<Dashboard>('/analytics/dashboard?' + query.toString()));
    } catch (cause) {
      setError((cause as Error).message);
    } finally {
      setLoading(false);
    }
  };
  useEffect(() => {
    void load();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps
  const cards = montarCards(data?.sales, profile);

  return (
    <main className="mx-auto w-full max-w-[1800px] space-y-6 px-4 py-6 sm:px-8 lg:py-8">
      <header>
        <Text variant="tituloTela">Painel de Controle</Text>
        <Text variant="corpoSecundario" className="mt-1 block">
          Resultados do período e posição atual de estoque e contas.
        </Text>
      </header>

      <FiltrosDoPainel
        profile={profile}
        setProfile={setProfile}
        from={from}
        setFrom={setFrom}
        to={to}
        setTo={setTo}
        branchId={branchId}
        setBranchId={setBranchId}
        sellerId={sellerId}
        setSellerId={setSellerId}
        loading={loading}
        onSubmit={() => void load()}
      />
      <Divider />

      {error && (
        <Text variant="corpo" tone="perigo" role="alert" className="block">
          {error}
        </Text>
      )}
      {data && !data.ready && (
        <Text variant="corpo" tone="apoio" role="status" className="block">
          {data.message}
        </Text>
      )}

      {loading && (
        <div className="flex justify-center py-14">
          <Text variant="corpo" role="status" tone="sutil">
            Carregando…
          </Text>
        </div>
      )}

      {!loading && data?.ready && (
        <ResultadosDaConsulta
          data={data}
          profile={profile}
          from={from}
          to={to}
          branchId={branchId}
          cards={cards}
        />
      )}
    </main>
  );
}
