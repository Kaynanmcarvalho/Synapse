/* eslint-disable max-lines-per-function */
import { Button, Input, Text } from '@synapse/sdl';
import type { FuncionarioNaLista } from '@synapse/types';
import { Plus, RotateCw, Search } from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';
import { listarFuncionarios } from './funcionarios.api';
import { JanelaDoFuncionario } from './JanelaDoFuncionario';
import { TabelaDeFuncionarios } from './TabelaDeFuncionarios';

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
          <Text variant="tituloTela">Funcionários</Text>
          <Text variant="corpoSecundario">
            Ficha, foto, comissão e o login de cada um. Quem é vendedor aparece no Ponto de Vendas e
            no PDV.
          </Text>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="quiet" onClick={() => void carregar(termo)}>
            <RotateCw size={14} aria-hidden="true" /> Atualizar
          </Button>
          <Button variant="primary" onClick={() => setAberto({ id: null })}>
            <Plus size={15} aria-hidden="true" /> Novo funcionário
          </Button>
        </div>
      </header>

      <label className="relative mb-3 block">
        <Search
          size={15}
          aria-hidden="true"
          className="text-stone pointer-events-none absolute left-3 top-1/2 -translate-y-1/2"
        />
        <Input
          value={termo}
          onChange={(evento) => setTermo(evento.target.value)}
          placeholder="Código, nome, CPF, cargo ou departamento"
          aria-label="Buscar funcionário"
          className="w-full pl-9"
        />
      </label>

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
            {termo ? 'Nenhum funcionário encontrado.' : 'Nenhum funcionário cadastrado ainda.'}
          </Text>
        ) : null}
        {itens?.length ? (
          <TabelaDeFuncionarios itens={itens} aoAbrir={(id) => setAberto({ id })} />
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
        <JanelaDoFuncionario
          funcionarioId={aberto.id}
          aoFechar={() => setAberto(null)}
          aoSalvar={() => void carregar(termo)}
        />
      ) : null}
    </main>
  );
}
