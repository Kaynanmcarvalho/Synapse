import {
  classesDaLinha,
  DataGridCelula,
  IconButton,
  Input,
  Select,
  Status,
  TAMANHO_DE_ICONE,
  Text,
} from '@synapse/sdl';
import type { NfceSeriesAssignment } from '@synapse/types';
import { Trash2 } from 'lucide-react';
import { lerInteiro } from '../assistente.formato';
import { problemasDaLinhaDeSerie } from '../assistente.pendencias';
import { INTEGRADO, type CampoDaSerie } from './series.colecao';

/** Número com o mesmo parse e o mesmo teto de antes (`lerInteiro` + clamp),
 *  continua `type="text"` com teclado numérico — só alinhado à direita com
 *  algarismo de largura fixa. */
function CampoNumerico({
  rotulo,
  valor,
  maximo,
  invalido,
  largura,
  aoSair,
  aoMudar,
}: {
  readonly rotulo: string;
  readonly valor: number;
  readonly maximo: number;
  readonly invalido: boolean;
  readonly largura: string;
  readonly aoSair: () => void;
  readonly aoMudar: (valor: number) => void;
}) {
  return (
    <DataGridCelula
      densidade="compacta"
      alinhamento="direita"
      truncar={false}
      className={`${largura} px-1`}
    >
      <Input
        density="compacta"
        align="right"
        aria-label={rotulo}
        inputMode="numeric"
        className={INTEGRADO}
        value={String(valor)}
        invalid={invalido}
        onBlur={aoSair}
        onChange={(e) => aoMudar(Math.min(lerInteiro(e.target.value), maximo))}
      />
    </DataGridCelula>
  );
}

/** Identificador: mesmo `trim` a cada tecla de antes (é o que impede espaço
 *  no fim virar "outro" terminal na regra de repetição). */
function CelulaDoIdentificador({
  rotulo,
  valor,
  invalido,
  idDoAviso,
  aoSair,
  aoMudar,
}: {
  readonly rotulo: string;
  readonly valor: string;
  readonly invalido: boolean;
  readonly idDoAviso: string | undefined;
  readonly aoSair: () => void;
  readonly aoMudar: (valor: string) => void;
}) {
  return (
    <DataGridCelula densidade="compacta" truncar={false} className="px-1">
      <Input
        density="compacta"
        aria-label={rotulo}
        className={INTEGRADO}
        value={valor}
        maxLength={120}
        invalid={invalido}
        aria-describedby={idDoAviso}
        onBlur={aoSair}
        onChange={(e) => aoMudar(e.target.value.trim())}
      />
    </DataGridCelula>
  );
}

/** Sistema e nome: sem regra, só os mesmos controles integrados. */
function SistemaENome({
  linha,
  sufixo,
  aoMudar,
}: {
  readonly linha: NfceSeriesAssignment;
  readonly sufixo: string;
  readonly aoMudar: (parcial: Partial<NfceSeriesAssignment>) => void;
}) {
  return (
    <>
      <DataGridCelula densidade="compacta" truncar={false} className="w-36 px-1">
        <Select
          density="compacta"
          aria-label={`Sistema${sufixo}`}
          className={INTEGRADO}
          value={linha.system}
          onChange={(e) => aoMudar({ system: e.target.value === 'PDV' ? 'PDV' : 'RETAGUARDA' })}
        >
          <option value="RETAGUARDA">Retaguarda</option>
          <option value="PDV">PDV</option>
        </Select>
      </DataGridCelula>
      <DataGridCelula densidade="compacta" truncar={false} className="px-1">
        <Input
          density="compacta"
          aria-label={`Nome${sufixo}`}
          className={INTEGRADO}
          value={linha.name}
          maxLength={80}
          onChange={(e) => aoMudar({ name: e.target.value })}
        />
      </DataGridCelula>
    </>
  );
}

export interface PropsDaLinhaDeSerie {
  readonly linha: NfceSeriesAssignment;
  readonly indice: number;
  readonly todas: readonly NfceSeriesAssignment[];
  readonly porTerminal: boolean;
  readonly tocado: (campo: CampoDaSerie) => boolean;
  readonly aoTocar: (campo: CampoDaSerie) => void;
  readonly aoMudar: (parcial: Partial<NfceSeriesAssignment>) => void;
  readonly aoRemover: () => void;
}

/** Uma linha do controle de séries. CÉLULA vermelha só depois que a pessoa
 *  deixou o campo; LINHA (identificador repetido) aparece na hora, porque
 *  envolve duas linhas já preenchidas. As regras são as do F8
 *  (`problemasDaLinhaDeSerie`), não uma cópia. */
export function LinhaDeSerie(props: PropsDaLinhaDeSerie) {
  const { linha, indice, porTerminal, tocado, aoTocar, aoMudar } = props;
  const numero = indice + 1;
  const sufixo = ` da linha ${numero}`;
  const rotulo = porTerminal ? 'Identificador do terminal' : 'E-mail do usuário';
  const problemas = problemasDaLinhaDeSerie(linha, props.todas);

  return (
    <>
      <tr
        data-linha={linha.id}
        className={`${classesDaLinha({ clicavel: false, focoComAnel: false })} focus-within:bg-surface-hover`}
      >
        <DataGridCelula densidade="compacta" papel="leading" truncar={false} className="w-24 pl-1">
          <span className="flex items-center gap-2">
            <Text variant="dado" tone="sutil">
              {String(numero).padStart(2, '0')}
            </Text>
            {indice === 0 && (
              <Status tone="info" variant="chip">
                Padrão
              </Status>
            )}
          </span>
        </DataGridCelula>
        <CelulaDoIdentificador
          rotulo={`${rotulo}${sufixo}`}
          valor={linha.identifier}
          invalido={(problemas.identificador && tocado('identifier')) || problemas.repetida}
          idDoAviso={problemas.repetida ? `serie-${linha.id}-aviso` : undefined}
          aoSair={() => aoTocar('identifier')}
          aoMudar={(identifier) => aoMudar({ identifier })}
        />
        <SistemaENome linha={linha} sufixo={sufixo} aoMudar={aoMudar} />
        <CampoNumerico
          rotulo={`Série${sufixo}`}
          valor={linha.series}
          maximo={999}
          largura="w-24"
          invalido={problemas.serie && tocado('series')}
          aoSair={() => aoTocar('series')}
          aoMudar={(series) => aoMudar({ series })}
        />
        <CampoNumerico
          rotulo={`Próximo número${sufixo}`}
          valor={linha.nextNumber}
          maximo={999_999_999}
          largura="w-40"
          invalido={problemas.proximoNumero && tocado('nextNumber')}
          aoSair={() => aoTocar('nextNumber')}
          aoMudar={(nextNumber) => aoMudar({ nextNumber })}
        />
        <DataGridCelula
          densidade="compacta"
          papel="action"
          alinhamento="direita"
          truncar={false}
          className="w-12 pr-1"
        >
          <IconButton
            density="compacta"
            label={`Remover linha ${numero}${linha.identifier ? ` (${linha.identifier})` : ''}`}
            className="hover:text-status-perigo"
            onClick={props.aoRemover}
          >
            <Trash2 size={TAMANHO_DE_ICONE.compacta} aria-hidden="true" />
          </IconButton>
        </DataGridCelula>
      </tr>
      {problemas.repetida && (
        <tr>
          <td colSpan={7} className="pb-2 pl-24">
            <Text variant="legenda" tone="perigo" id={`serie-${linha.id}-aviso`} className="block">
              {porTerminal ? 'Este terminal' : 'Este usuário'} aparece em mais de uma linha.
            </Text>
          </td>
        </tr>
      )}
    </>
  );
}
