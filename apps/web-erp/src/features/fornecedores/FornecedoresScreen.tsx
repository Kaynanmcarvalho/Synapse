/* eslint-disable max-lines-per-function */
import { Button, Input, Select, Text } from '@synapse/sdl';
import type { FornecedorNaLista } from '@synapse/types';
import { Plus, RotateCw, Search } from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';
import { listarFornecedores } from './fornecedores.api';
import { JanelaDoFornecedor } from './JanelaDoFornecedor';
import { TabelaDeFornecedores } from './TabelaDeFornecedores';

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
          <Text variant="tituloTela">Fornecedores</Text>
          <Text variant="corpoSecundario">
            O mesmo cadastro que as compras, a entrada por XML e a busca do sistema usam.
          </Text>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="quiet" onClick={() => void carregar(filtros)}>
            <RotateCw size={14} aria-hidden="true" /> Atualizar
          </Button>
          <Button variant="primary" onClick={() => setAberto({ id: null })}>
            <Plus size={15} aria-hidden="true" /> Novo fornecedor
          </Button>
        </div>
      </header>

      <div className="mb-3 flex flex-wrap items-center gap-2">
        <label className="relative min-w-[16rem] flex-1">
          <Search
            size={15}
            aria-hidden="true"
            className="text-stone pointer-events-none absolute left-3 top-1/2 -translate-y-1/2"
          />
          <Input
            value={filtros.termo}
            onChange={(evento) => setFiltros({ ...filtros, termo: evento.target.value })}
            placeholder="Código, razão social, fantasia, CNPJ/CPF ou cidade"
            aria-label="Buscar fornecedor"
            className="w-full pl-9"
          />
        </label>
        <Select
          value={filtros.ativo}
          onChange={(evento) =>
            setFiltros({ ...filtros, ativo: evento.target.value as Filtros['ativo'] })
          }
          aria-label="Situação"
        >
          <option value="">Ativos e inativos</option>
          <option value="ativos">Só ativos</option>
          <option value="inativos">Só inativos</option>
        </Select>
      </div>

      <div className="overflow-x-auto">
        {erro ? (
          <Text variant="corpoSecundario" tone="perigo" className="block p-4">
            {erro}
          </Text>
        ) : null}
        {itens === null ? (
          <Text variant="corpoSecundario" className="block p-4">
            Carregando…
          </Text>
        ) : null}
        {itens?.length === 0 && !erro ? (
          <Text variant="corpoSecundario" className="block p-6 text-center">
            {filtros.termo
              ? 'Nenhum fornecedor encontrado.'
              : 'Nenhum fornecedor cadastrado ainda.'}
          </Text>
        ) : null}
        {itens?.length ? (
          <TabelaDeFornecedores itens={itens} aoAbrir={(id) => setAberto({ id })} />
        ) : null}
      </div>
      {cursor ? (
        <div className="mt-3 flex justify-center">
          <Button variant="quiet" onClick={() => void carregarMais()}>
            Carregar mais
          </Button>
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
