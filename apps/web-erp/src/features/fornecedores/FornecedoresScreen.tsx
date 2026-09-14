/* eslint-disable max-lines-per-function */
import type { FornecedorNaLista } from '@synapse/types';
import { LoaderCircle, Plus, RotateCw, Search } from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';
import { BOTAO_CLARO, BOTAO_ESCURO, SELO, TOM } from '../cadastros/comum/estilos';
import { formatarDocumento, formatarTelefone } from '../customers/formato';
import { listarFornecedores } from './fornecedores.api';
import { JanelaDoFornecedor } from './JanelaDoFornecedor';

type Filtros = { readonly termo: string; readonly ativo: '' | 'ativos' | 'inativos' };

/** Cadastros › Fornecedores › Fornecedores: a lista e a janela do Syndata. É o
 *  mesmo cadastro que as compras, a entrada por XML e a busca usam. */
export function FornecedoresScreen() {
  const [filtros, setFiltros] = useState<Filtros>({ termo: '', ativo: '' });
  const [itens, setItens] = useState<readonly FornecedorNaLista[] | null>(null);
  const [cursor, setCursor] = useState<string | null>(null);
  const [erro, setErro] = useState<string | null>(null);
  const [aberto, setAberto] = useState<{ readonly id: string | null } | null>(null);

  const carregar = useCallback(async (atuais: Filtros) => {
    setErro(null);
    try {
      const pagina = await listarFornecedores(atuais, null);
      setItens(pagina.itens);
      setCursor(pagina.proximoCursor);
    } catch (falha: unknown) {
      setErro(falha instanceof Error ? falha.message : 'Não foi possível carregar os fornecedores');
      setItens([]);
    }
  }, []);

  useEffect(() => {
    const relogio = window.setTimeout(() => void carregar(filtros), 250);
    return () => window.clearTimeout(relogio);
  }, [filtros, carregar]);

  const carregarMais = async () => {
    if (!cursor) return;
    const pagina = await listarFornecedores(filtros, cursor);
    setItens((atuais) => [...(atuais ?? []), ...pagina.itens]);
    setCursor(pagina.proximoCursor);
  };

  return (
    <main className="mx-auto w-full max-w-[1400px] px-4 py-5">
      <header className="mb-4 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="font-display text-heading-md text-ink">Fornecedores</h1>
          <p className="text-body-sm text-stone">
            O mesmo cadastro que as compras, a entrada por XML e a busca do sistema usam.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button type="button" onClick={() => void carregar(filtros)} className={BOTAO_CLARO}>
            <RotateCw size={14} aria-hidden="true" /> Atualizar
          </button>
          <button type="button" onClick={() => setAberto({ id: null })} className={BOTAO_ESCURO}>
            <Plus size={15} aria-hidden="true" /> Novo fornecedor
          </button>
        </div>
      </header>

      <div className="border-hairline-light mb-3 flex flex-wrap items-center gap-2 rounded-2xl border bg-white p-3">
        <label className="relative min-w-[16rem] flex-1">
          <Search
            size={15}
            aria-hidden="true"
            className="text-stone pointer-events-none absolute left-3 top-1/2 -translate-y-1/2"
          />
          <input
            value={filtros.termo}
            onChange={(evento) => setFiltros({ ...filtros, termo: evento.target.value })}
            placeholder="Código, razão social, fantasia, CNPJ/CPF ou cidade"
            aria-label="Buscar fornecedor"
            className="border-hairline-light text-body-sm text-ink focus:border-hairline-strong h-9 w-full rounded-xl border pl-9 pr-3 outline-none"
          />
        </label>
        <select
          value={filtros.ativo}
          onChange={(evento) =>
            setFiltros({ ...filtros, ativo: evento.target.value as Filtros['ativo'] })
          }
          aria-label="Situação"
          className="border-hairline-light text-body-sm text-ink h-9 rounded-xl border bg-white px-3 outline-none"
        >
          <option value="">Ativos e inativos</option>
          <option value="ativos">Só ativos</option>
          <option value="inativos">Só inativos</option>
        </select>
      </div>

      <div className="border-hairline-light overflow-x-auto rounded-2xl border bg-white">
        {erro ? <p className="text-body-sm p-4 text-[#b3242f]">{erro}</p> : null}
        {itens === null ? (
          <p className="text-body-sm text-stone flex items-center gap-2 p-4">
            <LoaderCircle size={15} className="animate-spin" aria-hidden="true" /> Carregando…
          </p>
        ) : null}
        {itens?.length === 0 && !erro ? (
          <p className="text-body-sm text-stone p-6 text-center">
            {filtros.termo
              ? 'Nenhum fornecedor encontrado.'
              : 'Nenhum fornecedor cadastrado ainda.'}
          </p>
        ) : null}
        {itens?.length ? (
          <table className="w-full min-w-[880px]">
            <thead>
              <tr className="text-caption text-stone border-hairline-light border-b text-left">
                {[
                  'Código',
                  'Fornecedor',
                  'CNPJ / CPF',
                  'Cidade',
                  'Telefone',
                  'Grupo',
                  'Situação',
                ].map((coluna) => (
                  <th key={coluna} className="px-3 py-2 font-medium">
                    {coluna}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {itens.map((fornecedor) => (
                <tr
                  key={fornecedor.id}
                  tabIndex={0}
                  onClick={() => setAberto({ id: fornecedor.id })}
                  onKeyDown={(evento) => {
                    if (evento.key === 'Enter') setAberto({ id: fornecedor.id });
                  }}
                  className="border-hairline-light hover:bg-surface-soft text-body-sm cursor-pointer border-b transition last:border-0"
                >
                  <td className="text-stone px-3 py-2 tabular-nums">{fornecedor.codigo ?? '—'}</td>
                  <td className="px-3 py-2">
                    <span className="text-ink block font-semibold">{fornecedor.nomeFantasia}</span>
                    {fornecedor.razaoSocial !== fornecedor.nomeFantasia ? (
                      <span className="text-caption text-stone block truncate">
                        {fornecedor.razaoSocial}
                      </span>
                    ) : null}
                  </td>
                  <td className="text-charcoal px-3 py-2 tabular-nums">
                    {formatarDocumento(fornecedor.documento)}
                  </td>
                  <td className="text-charcoal px-3 py-2">
                    {fornecedor.uf
                      ? `${fornecedor.cidade}/${fornecedor.uf}`
                      : fornecedor.cidade || '—'}
                  </td>
                  <td className="text-charcoal px-3 py-2 tabular-nums">
                    {formatarTelefone(fornecedor.telefone) || '—'}
                  </td>
                  <td className="text-charcoal px-3 py-2">{fornecedor.grupo ?? '—'}</td>
                  <td className="px-3 py-2">
                    <span className={`${SELO} ${fornecedor.ativo ? TOM.positivo : TOM.neutro}`}>
                      {fornecedor.ativo ? 'Ativo' : 'Inativo'}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : null}
      </div>
      {cursor ? (
        <div className="mt-3 flex justify-center">
          <button type="button" onClick={() => void carregarMais()} className={BOTAO_CLARO}>
            Carregar mais
          </button>
        </div>
      ) : null}

      {aberto ? (
        <JanelaDoFornecedor
          fornecedorId={aberto.id}
          aoFechar={() => setAberto(null)}
          aoSalvar={() => void carregar(filtros)}
        />
      ) : null}
    </main>
  );
}
