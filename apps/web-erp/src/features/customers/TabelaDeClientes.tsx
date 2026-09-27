import {
  Button,
  classesDaLinha,
  DataGridCabecalho,
  DataGridCelula,
  Input,
  Select,
  Status,
  SynapseSignal,
  Text,
  type PapelDeColuna,
  type TomDeStatus,
} from '@synapse/sdl';
import type { ClienteNaLista } from '@synapse/types';
import { Search } from 'lucide-react';
import { CelulaDeDinheiro } from '../../components/datagrid/CelulaDeDinheiro';
import { formatarDocumento, formatarMoeda, formatarTelefone } from './formato';
import type { EstadoDaLista, FiltrosDaTela } from './useListaDeClientes';

/** A barra de filtros e a tabela da tela de clientes — piloto 1 da fundação
 *  de DataGrid (Fase 5): mesma aparência da Fase 4.3, agora composta com os
 *  primitives compartilhados (`DataGridCelula`/`DataGridCabecalho`/
 *  `classesDaLinha`) em vez de classes soltas reimplementadas aqui. Clientes
 *  não tem seleção, ordenação, resize ou reorder — não ganhou nenhum desses
 *  para "demonstrar" a fundação; paridade com a Fase 4.3 é o contrato. */

const ROTULO_DA_SITUACAO: Record<ClienteNaLista['situacao'], string> = {
  REGULAR: 'Liberado',
  OVERDUE: 'Inadimplente',
  BLOCKED: 'Bloqueado',
};

/** As mesmas categorias que `Status` já nomeia — não é decisão nova, é parar
 *  de reinventar cor de estado (`#fdeced`/`#b3242f`) fora do tema. */
const TOM_DA_SITUACAO: Record<ClienteNaLista['situacao'], TomDeStatus> = {
  REGULAR: 'ok',
  OVERDUE: 'vencido',
  BLOCKED: 'bloqueado',
};

interface DefinicaoDeColuna {
  readonly id: string;
  readonly rotulo: string;
  readonly papel: PapelDeColuna;
  readonly alinhamento: 'esquerda' | 'direita';
}

const COLUNAS: readonly DefinicaoDeColuna[] = [
  { id: 'codigo', rotulo: 'Código', papel: 'leading', alinhamento: 'esquerda' },
  { id: 'cliente', rotulo: 'Cliente', papel: 'primary', alinhamento: 'esquerda' },
  { id: 'documento', rotulo: 'CNPJ / CPF', papel: 'data', alinhamento: 'esquerda' },
  { id: 'cidade', rotulo: 'Cidade', papel: 'secondary', alinhamento: 'esquerda' },
  { id: 'telefone', rotulo: 'Telefone', papel: 'data', alinhamento: 'esquerda' },
  { id: 'limite', rotulo: 'Limite', papel: 'data', alinhamento: 'direita' },
  { id: 'situacao', rotulo: 'Situação', papel: 'status', alinhamento: 'esquerda' },
];

export function BarraDeFiltros({
  filtros,
  aoMudar,
}: {
  readonly filtros: FiltrosDaTela;
  readonly aoMudar: (filtros: FiltrosDaTela) => void;
}) {
  return (
    <div className="flex flex-wrap items-center gap-2 pb-4">
      {/* Sem rótulo visível — o mesmo padrão do campo de busca do header
       *  (ícone + placeholder) — mas `<label>` de verdade em volta do `Input`
       *  continua a associação semântica real: o clique no ícone também foca
       *  o campo, e o nome acessível (`aria-label`) chega ao leitor de tela
       *  como texto do próprio rótulo, não como substituto dele. */}
      <label className="relative min-w-[16rem] flex-1">
        <Search
          size={15}
          aria-hidden="true"
          className="text-stone pointer-events-none absolute left-3 top-1/2 -translate-y-1/2"
        />
        <Input
          value={filtros.termo}
          onChange={(evento) => aoMudar({ ...filtros, termo: evento.target.value })}
          placeholder="Nome, CNPJ/CPF, cidade ou código"
          aria-label="Buscar cliente"
          className="w-full pl-9"
        />
      </label>
      <Select
        value={filtros.situacao}
        onChange={(evento) =>
          aoMudar({ ...filtros, situacao: evento.target.value as FiltrosDaTela['situacao'] })
        }
        aria-label="Situação"
      >
        <option value="">Todas as situações</option>
        <option value="REGULAR">Liberado</option>
        <option value="OVERDUE">Inadimplente</option>
        <option value="BLOCKED">Bloqueado</option>
      </Select>
      <Select
        value={filtros.ativo}
        onChange={(evento) =>
          aoMudar({ ...filtros, ativo: evento.target.value as FiltrosDaTela['ativo'] })
        }
        aria-label="Classificação"
      >
        <option value="">Ativos e inativos</option>
        <option value="ativos">Só ativos</option>
        <option value="inativos">Só inativos</option>
      </Select>
    </div>
  );
}

function Linha({
  cliente,
  aoAbrir,
}: {
  readonly cliente: ClienteNaLista;
  readonly aoAbrir: () => void;
}) {
  return (
    <tr
      tabIndex={0}
      onClick={aoAbrir}
      onKeyDown={(evento) => {
        if (evento.key === 'Enter') aoAbrir();
      }}
      className={classesDaLinha({ hairlineNaLinha: false, focoComAnel: false })}
    >
      {/* Código — LEADING: dado auxiliar, discreto, font-data. Sem hairline
       *  embaixo: é o "entalhe" que separa o índice do resto da linha — o
       *  mesmo padrão inset da fila de crédito, aqui na única coluna que já
       *  funciona como âncora estável (Clientes não tem reorder). */}
      <DataGridCelula papel="leading" truncar={false} className="pl-1 pr-3">
        <SynapseSignal gatilho="foco-do-grupo" />
        <Text variant="dado" tone="sutil" className="text-body-sm pl-2">
          {cliente.codigo ?? '—'}
        </Text>
      </DataGridCelula>
      <DataGridCelula papel="primary" truncar={false} comHairline>
        <Text variant="corpo" className="block font-medium">
          {cliente.nome}
        </Text>
        {cliente.razaoSocial && cliente.razaoSocial !== cliente.nome ? (
          <Text variant="legenda" tone="apoio" className="block truncate">
            {cliente.razaoSocial}
          </Text>
        ) : null}
      </DataGridCelula>
      <DataGridCelula papel="data" truncar={false} comHairline>
        <Text variant="dado" className="text-body-sm">
          {formatarDocumento(cliente.documento)}
        </Text>
      </DataGridCelula>
      <DataGridCelula papel="secondary" truncar={false} comHairline>
        <Text variant="corpoSecundario">
          {cliente.uf ? `${cliente.cidade}/${cliente.uf}` : cliente.cidade}
        </Text>
      </DataGridCelula>
      <DataGridCelula papel="data" truncar={false} comHairline>
        <Text variant="dado" className="text-body-sm">
          {formatarTelefone(cliente.telefone)}
        </Text>
      </DataGridCelula>
      <CelulaDeDinheiro
        truncar={false}
        comHairline
        valorFormatado={formatarMoeda(cliente.limiteCentavos)}
      />
      <DataGridCelula papel="status" truncar={false} comHairline>
        <Status tone={TOM_DA_SITUACAO[cliente.situacao]}>
          {ROTULO_DA_SITUACAO[cliente.situacao]}
        </Status>
        {cliente.ativo ? null : (
          <Text variant="legenda" tone="apoio" className="ml-2 inline">
            Inativo
          </Text>
        )}
      </DataGridCelula>
    </tr>
  );
}

function Aviso({ estado, busca }: { readonly estado: EstadoDaLista; readonly busca: string }) {
  if (estado.status === 'carregando') {
    return (
      <Text variant="corpoSecundario" className="block py-10 text-center">
        Carregando clientes…
      </Text>
    );
  }
  if (estado.status === 'erro') {
    return (
      <Text variant="corpoSecundario" tone="perigo" className="block py-10 text-center">
        {estado.mensagem}
      </Text>
    );
  }
  if (estado.itens.length > 0) return null;
  return (
    <Text variant="corpoSecundario" className="block py-10 text-center">
      {busca.trim() ? `Nenhum cliente para "${busca.trim()}".` : 'Nenhum cliente cadastrado ainda.'}
    </Text>
  );
}

export function TabelaDeClientes({
  estado,
  busca,
  aoAbrir,
  aoCarregarMais,
}: {
  readonly estado: EstadoDaLista;
  readonly busca: string;
  readonly aoAbrir: (id: string) => void;
  readonly aoCarregarMais: () => void;
}) {
  return (
    <>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[48rem] border-collapse">
          <thead>
            <tr className="border-hairline-light border-b">
              {COLUNAS.map((coluna) => (
                <DataGridCabecalho
                  key={coluna.id}
                  id={coluna.id}
                  rotulo={coluna.rotulo}
                  alinhamento={coluna.alinhamento}
                  className={coluna.id === 'codigo' ? 'pl-1 pr-3' : undefined}
                />
              ))}
            </tr>
          </thead>
          <tbody>
            {estado.status === 'pronto'
              ? estado.itens.map((cliente) => (
                  <Linha key={cliente.id} cliente={cliente} aoAbrir={() => aoAbrir(cliente.id)} />
                ))
              : null}
          </tbody>
        </table>
        <Aviso estado={estado} busca={busca} />
      </div>
      {estado.status === 'pronto' && estado.proximoCursor ? (
        <div className="pt-4 text-center">
          <Button variant="quiet" onClick={aoCarregarMais}>
            Carregar mais
          </Button>
        </div>
      ) : null}
    </>
  );
}
