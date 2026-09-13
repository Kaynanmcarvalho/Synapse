import type { NfceSeriesAssignment, NfceSettings } from '@synapse/types';
import { MonitorSmartphone, Plus, Trash2 } from 'lucide-react';
import { identificadorDoDispositivo } from '../../../../lib/dev-auth';
import { lerInteiro } from '../assistente.formato';
import { BOTAO_ICONE, BOTAO_SECUNDARIO, Escolha, Grupo } from '../campos';

const CELULA =
  'h-10 w-full rounded-lg border border-hairline-light bg-canvas-light px-3 text-body-sm text-ink outline-none transition focus:border-hairline-strong focus:ring-4 focus:ring-primary/15';

const nomeDoDispositivo = (): string => {
  const agente = navigator.userAgent;
  const sistema = ['Windows', 'Android', 'iPhone', 'Mac', 'Linux'].find((nome) =>
    agente.includes(nome),
  );
  return `Web ERP${sistema ? ` — ${sistema === 'Mac' ? 'macOS' : sistema}` : ''}`;
};

const novaLinha = (parcial: Partial<NfceSeriesAssignment>): NfceSeriesAssignment => ({
  id: crypto.randomUUID(),
  identifier: '',
  system: 'RETAGUARDA',
  name: '',
  series: 1,
  nextNumber: 1,
  ...parcial,
});

type Mudar = (parcial: Partial<NfceSettings>) => void;

function Linha({
  linha,
  padrao,
  porTerminal,
  aoMudar,
  aoRemover,
}: {
  readonly linha: NfceSeriesAssignment;
  readonly padrao: boolean;
  readonly porTerminal: boolean;
  readonly aoMudar: (parcial: Partial<NfceSeriesAssignment>) => void;
  readonly aoRemover: () => void;
}) {
  const rotulo = porTerminal ? 'Identificador do terminal' : 'E-mail do usuário';
  return (
    <tr className="border-hairline-light border-b last:border-0">
      <td className="py-2 pr-2">
        <div className="flex items-center gap-2">
          <input
            aria-label={rotulo}
            className={CELULA}
            value={linha.identifier}
            maxLength={120}
            onChange={(e) => aoMudar({ identifier: e.target.value.trim() })}
          />
          {padrao && (
            <span className="bg-surface-soft text-caption text-ink shrink-0 rounded-full px-2 py-0.5 font-medium">
              Padrão
            </span>
          )}
        </div>
      </td>
      <td className="px-2 py-2">
        <select
          aria-label="Sistema"
          className={CELULA}
          value={linha.system}
          onChange={(e) => aoMudar({ system: e.target.value === 'PDV' ? 'PDV' : 'RETAGUARDA' })}
        >
          <option value="RETAGUARDA">Retaguarda</option>
          <option value="PDV">PDV</option>
        </select>
      </td>
      <td className="px-2 py-2">
        <input
          aria-label="Nome"
          className={CELULA}
          value={linha.name}
          maxLength={80}
          onChange={(e) => aoMudar({ name: e.target.value })}
        />
      </td>
      <td className="px-2 py-2">
        <input
          aria-label="Série"
          inputMode="numeric"
          className={CELULA}
          value={String(linha.series)}
          onChange={(e) => aoMudar({ series: Math.min(lerInteiro(e.target.value), 999) })}
        />
      </td>
      <td className="px-2 py-2">
        <input
          aria-label="Próximo número"
          inputMode="numeric"
          className={CELULA}
          value={String(linha.nextNumber)}
          onChange={(e) =>
            aoMudar({ nextNumber: Math.min(lerInteiro(e.target.value), 999_999_999) })
          }
        />
      </td>
      <td className="py-2 pl-2 text-right">
        <button
          type="button"
          onClick={aoRemover}
          aria-label="Remover linha"
          className={BOTAO_ICONE}
        >
          <Trash2 size={16} />
        </button>
      </td>
    </tr>
  );
}

export function AbaNfceSeries({
  nfce,
  mudar,
}: {
  readonly nfce: NfceSettings;
  readonly mudar: Mudar;
}) {
  const porTerminal = nfce.seriesMode === 'TERMINAL';
  const dispositivo = identificadorDoDispositivo();
  const desteDispositivo = nfce.series.find((linha) => linha.identifier === dispositivo);
  const trocar = (id: string, parcial: Partial<NfceSeriesAssignment>) =>
    mudar({
      series: nfce.series.map((linha) => (linha.id === id ? { ...linha, ...parcial } : linha)),
    });

  return (
    <Grupo
      titulo="Controle de séries"
      descricao="A primeira linha é a série padrão das vendas com NFC-e."
      acao={
        <div className="flex flex-wrap gap-2">
          {porTerminal && !desteDispositivo && (
            <button
              type="button"
              className={BOTAO_SECUNDARIO}
              onClick={() =>
                mudar({
                  series: [
                    ...nfce.series,
                    novaLinha({ identifier: dispositivo, name: nomeDoDispositivo() }),
                  ],
                })
              }
            >
              <MonitorSmartphone size={16} aria-hidden="true" /> Este dispositivo
            </button>
          )}
          <button
            type="button"
            className={BOTAO_SECUNDARIO}
            onClick={() => mudar({ series: [...nfce.series, novaLinha({})] })}
          >
            <Plus size={16} aria-hidden="true" /> Adicionar linha
          </button>
        </div>
      }
    >
      <Escolha
        rotulo="Separar séries"
        valor={nfce.seriesMode}
        opcoes={[
          { valor: 'TERMINAL', rotulo: 'Por terminal' },
          { valor: 'USER', rotulo: 'Por usuário' },
        ]}
        aoMudar={(seriesMode) => mudar({ seriesMode })}
      />
      <div className="border-hairline-light mt-6 overflow-x-auto rounded-2xl border px-4">
        <table className="w-full min-w-[760px] text-left">
          <thead>
            <tr className="border-hairline-light text-caption text-mute border-b">
              <th className="py-3 pr-2 font-medium">
                {porTerminal ? 'Identificador do terminal' : 'E-mail do usuário'}
              </th>
              <th className="w-36 px-2 py-3 font-medium">Sistema</th>
              <th className="px-2 py-3 font-medium">Nome</th>
              <th className="w-24 px-2 py-3 font-medium">Série</th>
              <th className="w-36 px-2 py-3 font-medium">Próximo número</th>
              <th className="w-12 py-3 pl-2" aria-label="Ações" />
            </tr>
          </thead>
          <tbody>
            {nfce.series.map((linha, indice) => (
              <Linha
                key={linha.id}
                linha={linha}
                padrao={indice === 0}
                porTerminal={porTerminal}
                aoMudar={(parcial) => trocar(linha.id, parcial)}
                aoRemover={() =>
                  mudar({ series: nfce.series.filter((item) => item.id !== linha.id) })
                }
              />
            ))}
            {nfce.series.length === 0 && (
              <tr>
                <td colSpan={6} className="text-body-sm text-stone py-8 text-center">
                  Nenhuma série cadastrada.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
      {porTerminal && (
        <dl className="bg-surface-soft text-body-sm mt-6 grid gap-x-6 gap-y-2 rounded-2xl p-5 sm:grid-cols-[auto_1fr]">
          <dt className="text-mute">Identificador deste dispositivo</dt>
          <dd className="text-ink break-all font-mono text-[13px]">{dispositivo}</dd>
          <dt className="text-mute">Série NFC-e</dt>
          <dd className="text-ink">
            {desteDispositivo ? desteDispositivo.series : 'Sem série própria'}
          </dd>
          <dt className="text-mute">Próximo número NFC-e</dt>
          <dd className="text-ink">{desteDispositivo ? desteDispositivo.nextNumber : '—'}</dd>
        </dl>
      )}
    </Grupo>
  );
}
