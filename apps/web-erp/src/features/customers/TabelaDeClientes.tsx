import type { ClienteNaLista } from '@synapse/types';
import { Search } from 'lucide-react';
import { formatarDocumento, formatarMoeda, formatarTelefone } from './formato';
import type { EstadoDaLista, FiltrosDaTela } from './useListaDeClientes';

/** A barra de filtros e a tabela da tela de clientes. */

const ROTULO_DA_SITUACAO: Record<ClienteNaLista['situacao'], string> = {
  REGULAR: 'Liberado',
  OVERDUE: 'Inadimplente',
  BLOCKED: 'Bloqueado',
};

const TOM_DA_SITUACAO: Record<ClienteNaLista['situacao'], string> = {
  REGULAR: 'bg-surface-soft text-charcoal',
  OVERDUE: 'bg-[#fdeced] text-[#b3242f]',
  BLOCKED: 'bg-[#fdeced] text-[#b3242f]',
};

const COLUNAS = ['Código', 'Cliente', 'CNPJ / CPF', 'Cidade', 'Telefone', 'Limite', 'Situação'];

const SELECAO =
  'border-hairline-light text-body-sm text-ink h-9 rounded-xl border bg-white px-3 outline-none';

export function BarraDeFiltros({
  filtros,
  aoMudar,
}: {
  readonly filtros: FiltrosDaTela;
  readonly aoMudar: (filtros: FiltrosDaTela) => void;
}) {
  return (
    <div className="border-hairline-light mb-3 flex flex-wrap items-center gap-2 rounded-2xl border bg-white p-3">
      <label className="relative min-w-[16rem] flex-1">
        <Search
          size={15}
          aria-hidden="true"
          className="text-stone pointer-events-none absolute left-3 top-1/2 -translate-y-1/2"
        />
        <input
          value={filtros.termo}
          onChange={(evento) => aoMudar({ ...filtros, termo: evento.target.value })}
          placeholder="Nome, CNPJ/CPF, cidade ou código"
          aria-label="Buscar cliente"
          className="border-hairline-light text-body-sm text-ink focus:border-hairline-strong h-9 w-full rounded-xl border pl-9 pr-3 outline-none"
        />
      </label>
      <select
        value={filtros.situacao}
        onChange={(evento) =>
          aoMudar({ ...filtros, situacao: evento.target.value as FiltrosDaTela['situacao'] })
        }
        aria-label="Situação"
        className={SELECAO}
      >
        <option value="">Todas as situações</option>
        <option value="REGULAR">Liberado</option>
        <option value="OVERDUE">Inadimplente</option>
        <option value="BLOCKED">Bloqueado</option>
      </select>
      <select
        value={filtros.ativo}
        onChange={(evento) =>
          aoMudar({ ...filtros, ativo: evento.target.value as FiltrosDaTela['ativo'] })
        }
        aria-label="Classificação"
        className={SELECAO}
      >
        <option value="">Ativos e inativos</option>
        <option value="ativos">Só ativos</option>
        <option value="inativos">Só inativos</option>
      </select>
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
      className="border-hairline-light hover:bg-surface-soft cursor-pointer border-b transition last:border-0"
    >
      <td className="text-body-sm text-stone px-3 py-2 tabular-nums">{cliente.codigo ?? '—'}</td>
      <td className="px-3 py-2">
        <span className="text-body-sm text-ink block font-semibold">{cliente.nome}</span>
        {cliente.razaoSocial && cliente.razaoSocial !== cliente.nome ? (
          <span className="text-caption text-stone block truncate">{cliente.razaoSocial}</span>
        ) : null}
      </td>
      <td className="text-body-sm text-charcoal px-3 py-2 tabular-nums">
        {formatarDocumento(cliente.documento)}
      </td>
      <td className="text-body-sm text-charcoal px-3 py-2">
        {cliente.uf ? `${cliente.cidade}/${cliente.uf}` : cliente.cidade}
      </td>
      <td className="text-body-sm text-charcoal px-3 py-2 tabular-nums">
        {formatarTelefone(cliente.telefone)}
      </td>
      <td className="text-body-sm text-ink px-3 py-2 text-right tabular-nums">
        {formatarMoeda(cliente.limiteCentavos)}
      </td>
      <td className="px-3 py-2">
        <span
          className={`text-caption inline-flex items-center rounded-full px-2 py-0.5 ${TOM_DA_SITUACAO[cliente.situacao]}`}
        >
          {ROTULO_DA_SITUACAO[cliente.situacao]}
        </span>
        {cliente.ativo ? null : <span className="text-caption text-stone ml-2">Inativo</span>}
      </td>
    </tr>
  );
}

function Aviso({ estado, busca }: { readonly estado: EstadoDaLista; readonly busca: string }) {
  if (estado.status === 'carregando') {
    return <p className="text-body-sm text-stone py-10 text-center">Carregando clientes…</p>;
  }
  if (estado.status === 'erro') {
    return <p className="text-body-sm py-10 text-center text-[#b3242f]">{estado.mensagem}</p>;
  }
  if (estado.itens.length > 0) return null;
  return (
    <p className="text-body-sm text-stone py-10 text-center">
      {busca.trim() ? `Nenhum cliente para "${busca.trim()}".` : 'Nenhum cliente cadastrado ainda.'}
    </p>
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
      <div className="border-hairline-light overflow-x-auto rounded-2xl border bg-white">
        <table className="w-full min-w-[48rem] border-collapse">
          <thead>
            <tr className="border-hairline-light bg-canvas-light border-b">
              {COLUNAS.map((coluna) => (
                <th
                  key={coluna}
                  className={`text-caption text-stone px-3 py-2 font-semibold uppercase tracking-[0.06em] ${coluna === 'Limite' ? 'text-right' : 'text-left'}`}
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
        <div className="mt-3 text-center">
          <button
            type="button"
            onClick={aoCarregarMais}
            className="bg-surface-soft text-button-sm text-ink inline-flex h-9 items-center gap-2 rounded-full px-4 transition hover:bg-[#ececee]"
          >
            Carregar mais
          </button>
        </div>
      ) : null}
    </>
  );
}
