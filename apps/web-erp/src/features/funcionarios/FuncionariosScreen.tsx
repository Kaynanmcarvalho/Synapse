/* eslint-disable max-lines-per-function */
import type { FuncionarioNaLista } from '@synapse/types';
import { LoaderCircle, Plus, RotateCw, Search } from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';
import { BOTAO_CLARO, BOTAO_ESCURO, SELO, TOM } from '../cadastros/comum/estilos';
import { formatarTelefone } from '../customers/formato';
import { listarFuncionarios } from './funcionarios.api';
import { JanelaDoFuncionario } from './JanelaDoFuncionario';

/** Cadastros › Funcionários › Funcionários: a lista para achar e a janela do
 *  Syndata para cadastrar. O vendedor do Ponto de Vendas e do PDV sai daqui. */
export function FuncionariosScreen() {
  const [termo, setTermo] = useState('');
  const [itens, setItens] = useState<readonly FuncionarioNaLista[] | null>(null);
  const [cursor, setCursor] = useState<string | null>(null);
  const [erro, setErro] = useState<string | null>(null);
  const [aberto, setAberto] = useState<{ readonly id: string | null } | null>(null);

  const carregar = useCallback(async (busca: string) => {
    setErro(null);
    try {
      const pagina = await listarFuncionarios(busca, null);
      setItens(pagina.itens);
      setCursor(pagina.proximoCursor);
    } catch (falha: unknown) {
      setErro(falha instanceof Error ? falha.message : 'Não foi possível carregar os funcionários');
      setItens([]);
    }
  }, []);

  useEffect(() => {
    const relogio = window.setTimeout(() => void carregar(termo), 250);
    return () => window.clearTimeout(relogio);
  }, [termo, carregar]);

  const carregarMais = async () => {
    if (!cursor) return;
    const pagina = await listarFuncionarios(termo, cursor);
    setItens((atuais) => [...(atuais ?? []), ...pagina.itens]);
    setCursor(pagina.proximoCursor);
  };

  return (
    <main className="mx-auto w-full max-w-[1400px] px-4 py-5">
      <header className="mb-4 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="font-display text-heading-md text-ink">Funcionários</h1>
          <p className="text-body-sm text-stone">
            Ficha, foto, comissão e o login de cada um. Quem é vendedor aparece no Ponto de Vendas e
            no PDV.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button type="button" onClick={() => void carregar(termo)} className={BOTAO_CLARO}>
            <RotateCw size={14} aria-hidden="true" /> Atualizar
          </button>
          <button type="button" onClick={() => setAberto({ id: null })} className={BOTAO_ESCURO}>
            <Plus size={15} aria-hidden="true" /> Novo funcionário
          </button>
        </div>
      </header>

      <div className="border-hairline-light mb-3 rounded-2xl border bg-white p-3">
        <label className="relative block">
          <Search
            size={15}
            aria-hidden="true"
            className="text-stone pointer-events-none absolute left-3 top-1/2 -translate-y-1/2"
          />
          <input
            value={termo}
            onChange={(evento) => setTermo(evento.target.value)}
            placeholder="Código, nome, CPF, cargo ou departamento"
            aria-label="Buscar funcionário"
            className="border-hairline-light text-body-sm text-ink focus:border-hairline-strong h-9 w-full rounded-xl border pl-9 pr-3 outline-none"
          />
        </label>
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
            {termo ? 'Nenhum funcionário encontrado.' : 'Nenhum funcionário cadastrado ainda.'}
          </p>
        ) : null}
        {itens?.length ? (
          <table className="w-full min-w-[880px]">
            <thead>
              <tr className="text-caption text-stone border-hairline-light border-b text-left">
                {[
                  'Código',
                  'Nome',
                  'Matrícula',
                  'Cargo',
                  'Departamento',
                  'Celular / Telefone',
                  'Situação',
                ].map((coluna) => (
                  <th key={coluna} className="px-3 py-2 font-medium">
                    {coluna}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {itens.map((funcionario) => (
                <tr
                  key={funcionario.id}
                  tabIndex={0}
                  onClick={() => setAberto({ id: funcionario.id })}
                  onKeyDown={(evento) => {
                    if (evento.key === 'Enter') setAberto({ id: funcionario.id });
                  }}
                  className="border-hairline-light hover:bg-surface-soft text-body-sm cursor-pointer border-b transition last:border-0"
                >
                  <td className="text-stone px-3 py-2 tabular-nums">{funcionario.codigo}</td>
                  <td className="text-ink px-3 py-2 font-semibold">{funcionario.nome}</td>
                  <td className="text-charcoal px-3 py-2">{funcionario.matricula ?? '—'}</td>
                  <td className="text-charcoal px-3 py-2">{funcionario.cargo}</td>
                  <td className="text-charcoal px-3 py-2">{funcionario.departamento}</td>
                  <td className="text-charcoal px-3 py-2 tabular-nums">
                    {formatarTelefone(funcionario.telefone) || '—'}
                  </td>
                  <td className="px-3 py-2">
                    <span className="flex flex-wrap gap-1">
                      {funcionario.vendedor ? (
                        <span className={`${SELO} ${TOM.positivo}`}>Vendedor</span>
                      ) : null}
                      {funcionario.bloqueado ? (
                        <span className={`${SELO} ${TOM.perigo}`}>Bloqueado</span>
                      ) : null}
                      {funcionario.demitido ? (
                        <span className={`${SELO} ${TOM.alerta}`}>Demitido</span>
                      ) : null}
                      {!funcionario.bloqueado && !funcionario.demitido && !funcionario.vendedor ? (
                        <span className={`${SELO} ${TOM.neutro}`}>Ativo</span>
                      ) : null}
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
        <JanelaDoFuncionario
          funcionarioId={aberto.id}
          aoFechar={() => setAberto(null)}
          aoSalvar={() => void carregar(termo)}
        />
      ) : null}
    </main>
  );
}
