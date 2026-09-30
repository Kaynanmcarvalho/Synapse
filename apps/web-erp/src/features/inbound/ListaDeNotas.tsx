import { classesDaLinha, Status, SynapseSignal, Text } from '@synapse/sdl';
import { formatarMoeda } from '../customers/formato';
import type { DfeEntry } from './dfe.api';
import { SITUACAO_LABEL, TOM_DA_SITUACAO } from './dfe.grammar';

export function ListaDeNotas({
  entries,
  carregando,
  erro,
  selectedKey,
  onSelect,
}: {
  readonly entries: readonly DfeEntry[];
  readonly carregando: boolean;
  readonly erro: string | null;
  readonly selectedKey: string | null;
  readonly onSelect: (key: string) => void;
}) {
  if (carregando) return <Text variant="corpoSecundario">Carregando…</Text>;
  if (erro)
    return (
      <Text variant="corpo" tone="perigo" role="alert">
        {erro}
      </Text>
    );
  if (entries.length === 0)
    return (
      <Text variant="corpoSecundario" role="status">
        Importe um XML para começar.
      </Text>
    );
  return (
    <ul className="border-line-fina -mx-2 border-t">
      {entries.map((entry) => {
        const selecionado = selectedKey === entry.nota.chaveDeAcesso;
        return (
          <li key={entry.nota.chaveDeAcesso} className="border-line-fina border-b">
            <button
              type="button"
              data-nota={entry.nota.chaveDeAcesso}
              aria-current={selecionado || undefined}
              onClick={() => onSelect(entry.nota.chaveDeAcesso)}
              className={`${classesDaLinha({ selecionada: selecionado, hairlineNaLinha: false })} flex w-full items-start gap-3 px-2 py-2.5 text-left`}
            >
              <SynapseSignal ativo={selecionado} />
              <span className="min-w-0 flex-1">
                <span className="flex items-center justify-between gap-2">
                  <Text variant="dado" className="font-medium">
                    NF-e {entry.nota.numero}
                  </Text>
                  <Status tone={TOM_DA_SITUACAO[entry.conferencia.situacao]}>
                    {SITUACAO_LABEL[entry.conferencia.situacao]}
                  </Status>
                </span>
                <Text variant="legenda" className="mt-0.5 block truncate">
                  {entry.nota.emitente.nome}
                </Text>
                <Text variant="dado" className="mt-1 block font-semibold">
                  {formatarMoeda(entry.nota.valorTotalCentavos)}
                </Text>
              </span>
            </button>
          </li>
        );
      })}
    </ul>
  );
}
