import { Button, Input, Select, Status, Text, type TomDeStatus } from '@synapse/sdl';
import type { ClienteNaLista } from '@synapse/types';
import { Search } from 'lucide-react';
import { separarMoeda } from '../../lib/dinheiro';
import { formatarDocumento, formatarMoeda, formatarTelefone } from './formato';
import type { EstadoDaLista, FiltrosDaTela } from './useListaDeClientes';

/** A barra de filtros e a tabela da tela de clientes — o primeiro teste da
 *  linguagem visual da Fase 4.2 fora da Home: mesmo grid de dado, mesmo
 *  `font-data`, mesmo `Status` do SDL, sem virar "tabela premium" (sem célula
 *  arredondada, sem linha com sombra, sem zebra gratuita). */

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

const COLUNAS = ['Código', 'Cliente', 'CNPJ / CPF', 'Cidade', 'Telefone', 'Limite', 'Situação'];

export function BarraDeFiltros({
  filtros,
  aoMudar,
}: {
  readonly filtros: FiltrosDaTela;
  readonly aoMudar: (filtros: FiltrosDaTela) => void;
}) {
  return (
    <div className="flex flex-wrap items-center gap-2 pb-4">
      <div className="relative min-w-[16rem] flex-1">
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
      </div>
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

/** Todo `<td>` tem a linha de baixo, menos o primeiro: o hairline começa no
 *  Cliente, não no Código — o mesmo inset deliberado, não um
 *  `border-bottom: 1px solid gray` em tudo (§10 da Fase 4.3). */
const CELULA = 'py-3 px-3 border-hairline-light border-b';
const CELULA_LEADING = 'py-3 pl-1 pr-3';

function Linha({
  cliente,
  aoAbrir,
}: {
  readonly cliente: ClienteNaLista;
  readonly aoAbrir: () => void;
}) {
  const { prefixo, numero } = separarMoeda(formatarMoeda(cliente.limiteCentavos));
  return (
    <tr
      tabIndex={0}
      onClick={aoAbrir}
      onKeyDown={(evento) => {
        if (evento.key === 'Enter') aoAbrir();
      }}
      className="hover:bg-surface-hover focus-visible:bg-surface-hover group cursor-pointer outline-none"
    >
      {/* Código — LEADING: dado auxiliar, discreto, font-data. Sem hairline
       *  embaixo: é o "entalhe" que separa o índice do resto da linha (o
       *  mesmo raciocínio do índice operacional da Home, sem repetir o
       *  primitive — aqui o dado já existe, não é uma posição inventada). */}
      <td className={`${CELULA_LEADING} relative`}>
        <span
          aria-hidden="true"
          className="bg-primary duration-instantaneo absolute inset-y-2 left-0 w-[2px] scale-y-0 rounded-full opacity-0 transition-all group-focus-visible:scale-y-100 group-focus-visible:opacity-100"
        />
        <Text variant="dado" tone="sutil" className="text-body-sm pl-2">
          {cliente.codigo ?? '—'}
        </Text>
      </td>
      <td className={CELULA}>
        <Text variant="corpo" className="block font-medium">
          {cliente.nome}
        </Text>
        {cliente.razaoSocial && cliente.razaoSocial !== cliente.nome ? (
          <Text variant="legenda" tone="apoio" className="block truncate">
            {cliente.razaoSocial}
          </Text>
        ) : null}
      </td>
      <td className={CELULA}>
        <Text variant="dado" className="text-body-sm">
          {formatarDocumento(cliente.documento)}
        </Text>
      </td>
      <td className={CELULA}>
        <Text variant="corpoSecundario">
          {cliente.uf ? `${cliente.cidade}/${cliente.uf}` : cliente.cidade}
        </Text>
      </td>
      <td className={CELULA}>
        <Text variant="dado" className="text-body-sm">
          {formatarTelefone(cliente.telefone)}
        </Text>
      </td>
      <td className={`${CELULA} text-right`}>
        <Text variant="dado" className="text-body-sm">
          {prefixo && <span className="text-ink-apoio mr-1 font-normal">{prefixo}</span>}
          {numero}
        </Text>
      </td>
      <td className={CELULA}>
        <Status tone={TOM_DA_SITUACAO[cliente.situacao]}>
          {ROTULO_DA_SITUACAO[cliente.situacao]}
        </Status>
        {cliente.ativo ? null : (
          <Text variant="legenda" tone="apoio" className="ml-2 inline">
            Inativo
          </Text>
        )}
      </td>
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
            <tr>
              {COLUNAS.map((coluna, indice) => (
                <th
                  key={coluna}
                  className={`text-caption text-ink-medio border-line-media whitespace-nowrap border-b py-2 font-medium ${
                    indice === 0 ? 'pl-1 pr-3' : 'px-3'
                  } ${coluna === 'Limite' ? 'text-right' : 'text-left'}`}
                >
                  {coluna}
                </th>
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
