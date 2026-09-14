/* eslint-disable max-lines-per-function */
import type { ItemDeTabela, MeioDePagamento, TipoDeTabela } from '@synapse/types';
import { MEIOS_DE_PAGAMENTO, ROTULO_DA_TABELA, ROTULO_DO_MEIO } from '@synapse/types';
import { Check, LoaderCircle, Pencil, Plus, X } from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';
import { NovoItemDeTabela } from '../comum/BuscaDeTabela';
import { alterarItemDeTabela, listarTabela } from '../comum/cadastros.api';
import { BOTAO_ESCURO, BOTAO_PEQUENO, INPUT_DE_BUSCA, SELO, TOM } from '../comum/estilos';

/** As tabelas auxiliares do Syndata (Praças e Regiões, Departamentos, Cargos,
 *  Grupos e Sub-Grupos de Fornecedores): código, nome e se está ativo. O código
 *  1 é o "GERAL" das fichas novas e fica sempre ativo. */

const DESCRICAO: Readonly<Record<TipoDeTabela, string>> = {
  cargos:
    'Cargo do funcionário (vendedor, gerente, motorista…). As permissões de acesso ficam em Ferramentas › Manutenção de Usuários.',
  departamentos: 'Departamento do funcionário.',
  pracas: 'Praça ou região de atendimento — usada no funcionário e no fornecedor.',
  'grupos-de-fornecedor': 'Agrupamento dos fornecedores para filtro e relatório.',
  'subgrupos-de-fornecedor': 'Subdivisão dos grupos de fornecedores.',
  'formas-de-pagamento': 'Como o cliente paga no Ponto de Vendas e no PDV.',
};

function Linha({
  tipo,
  item,
  aoAlterar,
}: {
  readonly tipo: TipoDeTabela;
  readonly item: ItemDeTabela;
  readonly aoAlterar: (item: ItemDeTabela) => void;
}) {
  const [editando, setEditando] = useState(false);
  const [nome, setNome] = useState(item.nome);
  const [meio, setMeio] = useState<MeioDePagamento>(item.meio ?? 'OUTROS');
  const [erro, setErro] = useState<string | null>(null);
  const [gravando, setGravando] = useState(false);

  const gravar = async (dados: { nome: string; ativo: boolean }) => {
    setGravando(true);
    setErro(null);
    try {
      aoAlterar(
        await alterarItemDeTabela(tipo, item.codigo, {
          ...dados,
          ...(tipo === 'formas-de-pagamento' ? { meio } : {}),
        }),
      );
      setEditando(false);
    } catch (falha: unknown) {
      setErro(falha instanceof Error ? falha.message : 'Não foi possível salvar');
    } finally {
      setGravando(false);
    }
  };

  return (
    <tr className="border-hairline-light text-body-sm border-b last:border-0">
      <td className="text-stone w-20 px-4 py-2.5 text-right tabular-nums">{item.codigo}</td>
      <td className="px-4 py-2.5">
        {editando ? (
          <div className="flex flex-wrap items-center gap-2">
            <input
              value={nome}
              maxLength={60}
              aria-label="Nome"
              onChange={(evento) => setNome(evento.target.value.toLocaleUpperCase('pt-BR'))}
              onKeyDown={(evento) => {
                if (evento.key === 'Enter') void gravar({ nome, ativo: item.ativo });
                if (evento.key === 'Escape') setEditando(false);
              }}
              className={`${INPUT_DE_BUSCA} max-w-sm`}
            />
            {tipo === 'formas-de-pagamento' ? (
              <select
                value={meio}
                onChange={(evento) => setMeio(evento.target.value as MeioDePagamento)}
                aria-label="Como funciona no caixa"
                className={`${INPUT_DE_BUSCA} max-w-[14rem]`}
              >
                {MEIOS_DE_PAGAMENTO.map((opcao) => (
                  <option key={opcao} value={opcao}>
                    {ROTULO_DO_MEIO[opcao]}
                  </option>
                ))}
              </select>
            ) : null}
            <button
              type="button"
              onClick={() => void gravar({ nome, ativo: item.ativo })}
              disabled={gravando}
              className={BOTAO_PEQUENO}
            >
              <Check size={14} aria-hidden="true" /> Salvar
            </button>
            <button type="button" onClick={() => setEditando(false)} className={BOTAO_PEQUENO}>
              <X size={14} aria-hidden="true" /> Cancelar
            </button>
          </div>
        ) : (
          <span className="text-ink font-medium">{item.nome}</span>
        )}
        {erro ? <p className="text-caption mt-1 text-[#b3242f]">{erro}</p> : null}
      </td>
      {tipo === 'formas-de-pagamento' ? (
        <td className="text-charcoal px-4 py-2.5">{item.meio ? ROTULO_DO_MEIO[item.meio] : '—'}</td>
      ) : null}
      <td className="px-4 py-2.5">
        <span className={`${SELO} ${item.ativo ? TOM.positivo : TOM.neutro}`}>
          {item.ativo ? 'Ativo' : 'Inativo'}
        </span>
      </td>
      <td className="px-4 py-2.5 text-right">
        <span className="inline-flex gap-2">
          <button type="button" onClick={() => setEditando(true)} className={BOTAO_PEQUENO}>
            <Pencil size={13} aria-hidden="true" /> Renomear
          </button>
          <button
            type="button"
            onClick={() => void gravar({ nome: item.nome, ativo: !item.ativo })}
            disabled={gravando || (item.codigo === 1 && tipo !== 'formas-de-pagamento')}
            className={BOTAO_PEQUENO}
          >
            {item.ativo ? 'Inativar' : 'Ativar'}
          </button>
        </span>
      </td>
    </tr>
  );
}

export function TabelaAuxiliarScreen({ tipo }: { readonly tipo: TipoDeTabela }) {
  const [itens, setItens] = useState<readonly ItemDeTabela[] | null>(null);
  const [erro, setErro] = useState<string | null>(null);
  const [novo, setNovo] = useState(false);

  const carregar = useCallback(async () => {
    setErro(null);
    try {
      setItens(await listarTabela(tipo));
    } catch (falha: unknown) {
      setErro(falha instanceof Error ? falha.message : 'Não foi possível carregar a tabela');
      setItens([]);
    }
  }, [tipo]);

  useEffect(() => {
    setItens(null);
    void carregar();
  }, [carregar]);

  const substituir = (alterado: ItemDeTabela) =>
    setItens(
      (atuais) =>
        atuais?.map((item) => (item.codigo === alterado.codigo ? alterado : item)) ?? null,
    );

  return (
    <main className="mx-auto w-full max-w-[1000px] px-4 py-5">
      <header className="mb-4 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="font-display text-heading-md text-ink">{ROTULO_DA_TABELA[tipo]}</h1>
          <p className="text-body-sm text-stone">{DESCRICAO[tipo]}</p>
        </div>
        <button type="button" onClick={() => setNovo(true)} className={BOTAO_ESCURO}>
          <Plus size={15} aria-hidden="true" /> Novo
        </button>
      </header>
      <div className="border-hairline-light overflow-x-auto rounded-2xl border bg-white">
        {erro ? <p className="text-body-sm p-4 text-[#b3242f]">{erro}</p> : null}
        {itens === null ? (
          <p className="text-body-sm text-stone flex items-center gap-2 p-4">
            <LoaderCircle size={15} className="animate-spin" aria-hidden="true" /> Carregando…
          </p>
        ) : (
          <table className="w-full min-w-[560px]">
            <thead>
              <tr className="text-caption text-stone border-hairline-light border-b text-left">
                <th className="px-4 py-2 text-right font-medium">Código</th>
                <th className="px-4 py-2 font-medium">Nome</th>
                {tipo === 'formas-de-pagamento' ? (
                  <th className="px-4 py-2 font-medium">No caixa</th>
                ) : null}
                <th className="px-4 py-2 font-medium">Situação</th>
                <th className="px-4 py-2" />
              </tr>
            </thead>
            <tbody>
              {itens.map((item) => (
                <Linha key={item.codigo} tipo={tipo} item={item} aoAlterar={substituir} />
              ))}
            </tbody>
          </table>
        )}
      </div>
      {novo ? (
        <NovoItemDeTabela
          tipo={tipo}
          aoFechar={() => setNovo(false)}
          aoCriar={(item) => {
            setNovo(false);
            setItens((atuais) => [...(atuais ?? []), item]);
          }}
        />
      ) : null}
    </main>
  );
}
