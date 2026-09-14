/* eslint-disable max-lines-per-function */
import { Building2, Check, LoaderCircle, Pencil, Plus, Trash2, X } from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';
import { apiRequest } from '../../lib/dev-auth';
import { corpoJson } from '../cadastros/comum/cadastros.api';
import {
  BOTAO_CLARO,
  BOTAO_ESCURO,
  BOTAO_PEQUENO,
  INPUT_DE_BUSCA,
  SELO,
  TOM,
} from '../cadastros/comum/estilos';

/** As filiais da empresa: a matriz e as demais, onde o PDV abre o caixa e o
 *  Ponto de Vendas lança o pedido. A empresa sem filial ganha a Matriz sozinha;
 *  aqui ela é renomeada e as outras filiais são criadas. */

export interface FilialDaEmpresa {
  readonly id: string;
  readonly name: string;
  readonly isHeadquarters: boolean;
}

export function FiliaisDaEmpresa({
  aoCarregar,
}: {
  readonly aoCarregar?: (filiais: readonly FilialDaEmpresa[]) => void;
}) {
  const [filiais, setFiliais] = useState<readonly FilialDaEmpresa[] | null>(null);
  const [nova, setNova] = useState('');
  const [editando, setEditando] = useState<{ readonly id: string; readonly nome: string } | null>(
    null,
  );
  const [ocupado, setOcupado] = useState(false);
  const [mensagem, setMensagem] = useState<string | null>(null);

  const carregar = useCallback(async () => {
    try {
      const lista = await apiRequest<FilialDaEmpresa[]>('/iam/branches');
      setFiliais(lista);
      aoCarregar?.(lista);
    } catch (falha: unknown) {
      setMensagem(falha instanceof Error ? falha.message : 'Não foi possível ler as filiais');
      setFiliais([]);
    }
  }, [aoCarregar]);

  useEffect(() => {
    void carregar();
  }, [carregar]);

  const executar = async (acao: () => Promise<unknown>, sucesso: string) => {
    setOcupado(true);
    setMensagem(null);
    try {
      await acao();
      setMensagem(sucesso);
      await carregar();
    } catch (falha: unknown) {
      setMensagem(falha instanceof Error ? falha.message : 'Não foi possível salvar');
    } finally {
      setOcupado(false);
    }
  };

  const criar = () => {
    const nome = nova.trim();
    if (!nome) return;
    void executar(
      () => apiRequest('/iam/branches', corpoJson('POST', { name: nome, isHeadquarters: false })),
      `Filial ${nome} cadastrada`,
    ).then(() => setNova(''));
  };

  const renomear = () => {
    const nome = editando?.nome.trim();
    if (!editando || !nome) return;
    void executar(
      () => apiRequest(`/iam/branches/${editando.id}`, corpoJson('PATCH', { name: nome })),
      'Nome da filial salvo',
    ).then(() => setEditando(null));
  };

  const excluir = (filial: FilialDaEmpresa) => {
    if (!window.confirm(`Excluir a filial ${filial.name}?`)) return;
    void executar(
      () => apiRequest(`/iam/branches/${filial.id}`, { method: 'DELETE' }),
      `Filial ${filial.name} excluída`,
    );
  };

  return (
    <section className="border-hairline-light space-y-4 rounded-2xl border bg-white p-5">
      <header className="flex items-center gap-3">
        <span className="bg-surface-soft text-ink flex h-10 w-10 items-center justify-center rounded-full">
          <Building2 size={18} aria-hidden="true" />
        </span>
        <div>
          <h2 className="font-display text-heading-sm text-ink">Filiais da empresa</h2>
          <p className="text-body-sm text-stone">
            Onde o PDV abre o caixa e o Ponto de Vendas lança o pedido.
          </p>
        </div>
      </header>

      {filiais === null ? (
        <p className="text-body-sm text-stone flex items-center gap-2">
          <LoaderCircle size={15} className="animate-spin" aria-hidden="true" /> Carregando…
        </p>
      ) : (
        <ul className="border-hairline-light divide-hairline-light divide-y rounded-xl border">
          {filiais.map((filial) => (
            <li key={filial.id} className="flex flex-wrap items-center gap-3 px-4 py-2.5">
              {editando?.id === filial.id ? (
                <form
                  className="flex min-w-0 flex-1 items-center gap-2"
                  onSubmit={(evento) => {
                    evento.preventDefault();
                    renomear();
                  }}
                >
                  <input
                    value={editando.nome}
                    maxLength={120}
                    aria-label="Nome da filial"
                    onChange={(evento) => setEditando({ id: filial.id, nome: evento.target.value })}
                    className={INPUT_DE_BUSCA}
                  />
                  <button type="submit" disabled={ocupado} className={BOTAO_PEQUENO}>
                    <Check size={13} aria-hidden="true" /> Salvar
                  </button>
                  <button type="button" onClick={() => setEditando(null)} className={BOTAO_PEQUENO}>
                    <X size={13} aria-hidden="true" /> Cancelar
                  </button>
                </form>
              ) : (
                <>
                  <span className="text-body-sm text-ink min-w-0 flex-1 truncate font-medium">
                    {filial.name}
                  </span>
                  {filial.isHeadquarters ? (
                    <span className={`${SELO} ${TOM.positivo}`}>Matriz</span>
                  ) : null}
                  <button
                    type="button"
                    onClick={() => setEditando({ id: filial.id, nome: filial.name })}
                    className={BOTAO_PEQUENO}
                  >
                    <Pencil size={13} aria-hidden="true" /> Renomear
                  </button>
                  {filial.isHeadquarters ? null : (
                    <button
                      type="button"
                      disabled={ocupado}
                      onClick={() => excluir(filial)}
                      className={BOTAO_PEQUENO}
                    >
                      <Trash2 size={13} aria-hidden="true" /> Excluir
                    </button>
                  )}
                </>
              )}
            </li>
          ))}
        </ul>
      )}

      <form
        className="flex flex-wrap gap-2"
        onSubmit={(evento) => {
          evento.preventDefault();
          criar();
        }}
      >
        <input
          value={nova}
          maxLength={120}
          onChange={(evento) => setNova(evento.target.value)}
          placeholder="Nome da nova filial (ex.: Filial Aparecida)"
          aria-label="Nome da nova filial"
          className={`${INPUT_DE_BUSCA} min-w-[14rem] flex-1`}
        />
        <button type="submit" disabled={ocupado || !nova.trim()} className={BOTAO_ESCURO}>
          <Plus size={15} aria-hidden="true" /> Cadastrar filial
        </button>
        <button type="button" onClick={() => void carregar()} className={BOTAO_CLARO}>
          Atualizar
        </button>
      </form>
      {mensagem ? (
        <p className="text-body-sm text-charcoal" role="status">
          {mensagem}
        </p>
      ) : null}
    </section>
  );
}
