import { Button, DataGridCabecalho, Text } from '@synapse/sdl';
import type { NfceSeriesAssignment, NfceSettings } from '@synapse/types';
import { MonitorSmartphone, Plus } from 'lucide-react';
import type { ReactNode, RefObject } from 'react';
import { Secao, ValoresDeLeitura } from '../../../../components/formulario/Formulario';
import { identificadorDoDispositivo } from '../../../../lib/dev-auth';
import { Escolha } from '../campos';
import { LinhaDeSerie } from './LinhaDeSerie';
import { nomeDoDispositivo, novaLinha, useCamposTocados, useFocoDaColecao } from './series.colecao';

/** Controle de séries da NFC-e (Fase 7.5).
 *
 *  É uma COLEÇÃO TABULAR DE CAMPOS, não uma grade com motor de edição: cada
 *  tecla vai direto para o formulário do assistente (`mudar`), que é a única
 *  fonte de verdade — sujo, salvar (F8), descartar (Esc) e as pendências
 *  continuam lá. Esta tabela não guarda rascunho, não tem commit por linha e
 *  não cancela célula com Esc (cancelar exigiria um segundo rascunho). */

type Mudar = (parcial: Partial<NfceSettings>) => void;

function Tabela({
  porTerminal,
  vazia,
  corpo,
  children,
}: {
  readonly porTerminal: boolean;
  readonly vazia: boolean;
  readonly corpo: RefObject<HTMLTableSectionElement | null>;
  readonly children: ReactNode;
}) {
  return (
    <div className="mt-6 overflow-x-auto">
      <table className="w-full min-w-[760px] border-collapse text-left">
        <thead>
          <tr className="border-hairline-light border-b">
            <DataGridCabecalho id="linha" rotulo="Linha" className="pl-1" />
            <DataGridCabecalho
              id="identificador"
              rotulo={porTerminal ? 'Identificador do terminal' : 'E-mail do usuário'}
            />
            <DataGridCabecalho id="sistema" rotulo="Sistema" />
            <DataGridCabecalho id="nome" rotulo="Nome" />
            <DataGridCabecalho id="serie" rotulo="Série" alinhamento="direita" />
            <DataGridCabecalho id="proximo" rotulo="Próximo número" alinhamento="direita" />
            <th className="w-12" aria-label="Ações" />
          </tr>
        </thead>
        <tbody ref={corpo}>
          {children}
          {vazia && (
            <tr>
              <td colSpan={7} className="py-8 text-center">
                <Text variant="corpoSecundario">
                  Nenhuma série cadastrada. Sem linha, a NFC-e continua com a série que já estava
                  gravada.
                </Text>
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}

function EsteDispositivo({
  dispositivo,
  linha,
}: {
  readonly dispositivo: string;
  readonly linha: NfceSeriesAssignment | undefined;
}) {
  return (
    <div className="border-line-fina mt-6 border-t pt-4">
      <ValoresDeLeitura
        itens={[
          { rotulo: 'Identificador deste dispositivo', valor: dispositivo, dado: true },
          {
            rotulo: 'Série NFC-e',
            valor: linha ? linha.series : 'Sem série própria',
            dado: Boolean(linha),
          },
          { rotulo: 'Próximo número NFC-e', valor: linha ? linha.nextNumber : '—', dado: true },
        ]}
      />
    </div>
  );
}

function AcoesDaColecao({
  desteDispositivo,
  adicionar,
  aoIncluirDispositivo,
  aoIncluir,
}: {
  readonly desteDispositivo: boolean;
  readonly adicionar: RefObject<HTMLButtonElement | null>;
  readonly aoIncluirDispositivo: () => void;
  readonly aoIncluir: () => void;
}) {
  return (
    <div className="flex flex-wrap gap-2">
      {desteDispositivo && (
        <Button variant="secondary" onClick={aoIncluirDispositivo}>
          <MonitorSmartphone size={16} aria-hidden="true" /> Este dispositivo
        </Button>
      )}
      <Button ref={adicionar} variant="secondary" onClick={aoIncluir}>
        <Plus size={16} aria-hidden="true" /> Adicionar linha
      </Button>
    </div>
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
  const { tocado, tocar } = useCamposTocados();
  const { corpo, adicionar, focar } = useFocoDaColecao(nfce.series);

  const trocar = (id: string, parcial: Partial<NfceSeriesAssignment>) =>
    mudar({
      series: nfce.series.map((linha) => (linha.id === id ? { ...linha, ...parcial } : linha)),
    });
  const incluir = (linha: NfceSeriesAssignment, campo: 'identificador' | 'nome') => {
    mudar({ series: [...nfce.series, linha] });
    focar({ tipo: 'linha', id: linha.id, campo });
  };
  /** Remove na hora, sem confirmação: nada vai ao servidor antes do F8, e o
   *  Esc do assistente descarta tudo. Mesmo filtro de antes (por id); o
   *  índice só escolhe o vizinho que recebe o foco. */
  const remover = (indice: number, id: string) => {
    const restantes = nfce.series.filter((item) => item.id !== id);
    mudar({ series: restantes });
    const vizinha = restantes[indice] ?? restantes[indice - 1];
    focar(
      vizinha ? { tipo: 'linha', id: vizinha.id, campo: 'identificador' } : { tipo: 'adicionar' },
    );
  };

  return (
    <Secao
      titulo="Controle de séries"
      descricao="A primeira linha é a série padrão das vendas com NFC-e."
      acao={
        <AcoesDaColecao
          desteDispositivo={porTerminal && !desteDispositivo}
          adicionar={adicionar}
          aoIncluirDispositivo={() =>
            incluir(novaLinha({ identifier: dispositivo, name: nomeDoDispositivo() }), 'nome')
          }
          aoIncluir={() => incluir(novaLinha({}), 'identificador')}
        />
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
      <Tabela porTerminal={porTerminal} vazia={nfce.series.length === 0} corpo={corpo}>
        {nfce.series.map((linha, indice) => (
          <LinhaDeSerie
            key={linha.id}
            linha={linha}
            indice={indice}
            todas={nfce.series}
            porTerminal={porTerminal}
            tocado={(campo) => tocado(linha.id, campo)}
            aoTocar={(campo) => tocar(linha.id, campo)}
            aoMudar={(parcial) => trocar(linha.id, parcial)}
            aoRemover={() => remover(indice, linha.id)}
          />
        ))}
      </Tabela>
      {porTerminal && <EsteDispositivo dispositivo={dispositivo} linha={desteDispositivo} />}
    </Secao>
  );
}
