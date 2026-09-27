import { Button, Divider, Surface, Text } from '@synapse/sdl';
import { Plus, RotateCw } from 'lucide-react';
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ROTAS } from '../../app/rotas';
import { JanelaDoCliente } from './JanelaDoCliente';
import { BarraDeFiltros, TabelaDeClientes } from './TabelaDeClientes';
import { useListaDeClientes, type FiltrosDaTela } from './useListaDeClientes';

/** Cadastro de clientes: a lista para achar, e a janela para cadastrar e
 *  corrigir. O mesmo cliente que a análise de crédito, o PDV e a busca usam.
 *
 *  Fase 4.3: primeira tela de listagem a receber a linguagem visual da Fase
 *  4.2 — a mesma folha (`Surface variant="pagina"`) sobre o mesmo chão
 *  (`bg-surface-tela` do AppShell) que a Home já usa, os mesmos botões do SDL
 *  no lugar dos botões-pílula, sem card ao redor da barra de filtros. */

const SEM_FILTRO: FiltrosDaTela = { termo: '', situacao: '', ativo: '' };

export function ClientesScreen() {
  const navegar = useNavigate();
  const [filtros, setFiltros] = useState<FiltrosDaTela>(SEM_FILTRO);
  const [aberta, setAberta] = useState<{ readonly id: string | null } | null>(null);
  const lista = useListaDeClientes(filtros);

  return (
    <Surface
      variant="pagina"
      as="main"
      className="max-w-conteudo-trabalho mx-auto w-full px-4 py-6 sm:px-6 lg:px-8 lg:py-8"
    >
      <div className="flex flex-wrap items-end justify-between gap-3 pb-4">
        <div>
          <Text variant="tituloTela">Clientes</Text>
          <Text variant="corpoSecundario" className="mt-1 block">
            O mesmo cadastro que a análise de crédito, o PDV e a busca do sistema usam.
          </Text>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="quiet" onClick={() => void lista.carregar()}>
            <RotateCw size={14} aria-hidden="true" /> Atualizar
          </Button>
          <Button variant="primary" onClick={() => setAberta({ id: null })}>
            <Plus size={15} aria-hidden="true" /> Novo cliente
          </Button>
        </div>
      </div>
      <Divider />

      <div className="pt-4">
        <BarraDeFiltros filtros={filtros} aoMudar={setFiltros} />
        <TabelaDeClientes
          estado={lista.estado}
          busca={lista.busca}
          aoAbrir={(id) => setAberta({ id })}
          aoCarregarMais={() => void lista.carregarMais()}
        />
      </div>

      {aberta ? (
        <JanelaDoCliente
          clienteId={aberta.id}
          aoFechar={() => setAberta(null)}
          aoSalvar={() => void lista.carregar()}
          aoAbrirCredito={(id) => navegar(`${ROTAS.analiseDeCredito}?cliente=${id}`)}
        />
      ) : null}
    </Surface>
  );
}
