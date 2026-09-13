import { Plus, RotateCw } from 'lucide-react';
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ROTAS } from '../../app/rotas';
import { JanelaDoCliente } from './JanelaDoCliente';
import { BarraDeFiltros, TabelaDeClientes } from './TabelaDeClientes';
import { useListaDeClientes, type FiltrosDaTela } from './useListaDeClientes';

/** Cadastro de clientes: a lista para achar, e a janela para cadastrar e
 *  corrigir. O mesmo cliente que a análise de crédito, o PDV e a busca usam. */

const SEM_FILTRO: FiltrosDaTela = { termo: '', situacao: '', ativo: '' };

export function ClientesScreen() {
  const navegar = useNavigate();
  const [filtros, setFiltros] = useState<FiltrosDaTela>(SEM_FILTRO);
  const [aberta, setAberta] = useState<{ readonly id: string | null } | null>(null);
  const lista = useListaDeClientes(filtros);

  return (
    <main className="mx-auto w-full max-w-[1400px] px-4 py-5">
      <header className="mb-4 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="font-display text-heading-md text-ink">Clientes</h1>
          <p className="text-body-sm text-stone">
            O mesmo cadastro que a análise de crédito, o PDV e a busca do sistema usam.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => void lista.carregar()}
            className="bg-surface-soft text-button-sm text-ink inline-flex h-9 items-center gap-2 rounded-full px-4 transition hover:bg-[#ececee]"
          >
            <RotateCw size={14} aria-hidden="true" /> Atualizar
          </button>
          <button
            type="button"
            onClick={() => setAberta({ id: null })}
            className="bg-canvas-dark text-button-sm hover:bg-charcoal inline-flex h-9 items-center gap-2 rounded-full px-4 text-white transition"
          >
            <Plus size={15} aria-hidden="true" /> Novo cliente
          </button>
        </div>
      </header>

      <BarraDeFiltros filtros={filtros} aoMudar={setFiltros} />
      <TabelaDeClientes
        estado={lista.estado}
        busca={lista.busca}
        aoAbrir={(id) => setAberta({ id })}
        aoCarregarMais={() => void lista.carregarMais()}
      />

      {aberta ? (
        <JanelaDoCliente
          clienteId={aberta.id}
          aoFechar={() => setAberta(null)}
          aoSalvar={() => void lista.carregar()}
          aoAbrirCredito={(id) => navegar(`${ROTAS.analiseDeCredito}?cliente=${id}`)}
        />
      ) : null}
    </main>
  );
}
