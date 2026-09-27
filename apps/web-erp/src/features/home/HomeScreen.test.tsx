import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { AuthContext } from '../../app/auth/AuthContext';
import { MENUS } from '../../app/menu/menu.data';
import { todosOsItens } from '../../app/menu/menu.utils';
import { ShellContext } from '../../app/shell/ShellContext';

const dev = vi.hoisted(() => ({ apiRequest: vi.fn() }));
vi.mock('../../lib/dev-auth', () => dev);

const credito = vi.hoisted(() => ({ listarFilaDeAnalise: vi.fn() }));
vi.mock('../credit/analise.api', () => credito);

import { ACESSO_RAPIDO } from './acessoRapido';
import { HomeScreen } from './HomeScreen';

/** A Home real, com o menu de verdade (para conferir os ids do Acesso Rápido)
 *  e a API trocada por dublê (a mesma composicao de Promise.allSettled que a
 *  tela usa hoje: cada fonte falha ou responde por conta propria). */

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

const USUARIO = { uid: 'u1', email: 'teste@synapse.dev', nome: 'Renier Teste' };

let raiz: Root;
let caixa: HTMLDivElement;

const esperar = async () => {
  await act(async () => {
    await Promise.resolve();
    await Promise.resolve();
  });
};

const renderizar = () => {
  caixa = document.createElement('div');
  document.body.appendChild(caixa);
  raiz = createRoot(caixa);
  act(() =>
    raiz.render(
      <MemoryRouter>
        <AuthContext.Provider
          value={{
            estado: { status: 'autenticado', usuario: USUARIO },
            entrar: vi.fn(),
            sair: vi.fn(),
          }}
        >
          <ShellContext.Provider value={{ abrirBusca: vi.fn(), menus: MENUS }}>
            <HomeScreen />
          </ShellContext.Provider>
        </AuthContext.Provider>
      </MemoryRouter>,
    ),
  );
};

const painelPronto = { ready: true, branches: [], stock: [] };

beforeEach(() => {
  vi.clearAllMocks();
  dev.apiRequest.mockImplementation((caminho: string) => {
    if (caminho.startsWith('/analytics/dashboard')) return Promise.resolve(painelPronto);
    if (caminho.startsWith('/inventory/lots')) return Promise.resolve({ items: [] });
    if (caminho.startsWith('/fiscal/mdfe')) return Promise.resolve([]);
    return Promise.reject(new Error(`rota não esperada no teste: ${caminho}`));
  });
  credito.listarFilaDeAnalise.mockResolvedValue([]);
});

afterEach(() => {
  if (raiz) act(() => raiz.unmount());
  caixa?.remove();
});

describe('Acesso Rápido — ids estáveis', () => {
  it('todo id referenciado existe de verdade no menu (não depende do rótulo exibido)', () => {
    const todos = todosOsItens(MENUS);
    for (const { id } of ACESSO_RAPIDO) {
      const achado = todos.find((item) => item.id === id);
      expect(achado, `id "${id}" não encontrado em nenhum item de menu`).toBeDefined();
      expect(achado?.situacao).toBe('disponivel');
    }
  });
});

describe('HomeScreen — busca', () => {
  it('não repete a busca global: a Home não tem "O que você precisa?"', async () => {
    renderizar();
    await esperar();
    expect(document.body.textContent).not.toContain('O que você precisa');
    expect(caixa.querySelector('[aria-label="Abrir busca global"]')).toBeNull();
  });
});

describe('HomeScreen — estados dos avisos', () => {
  it('carregando: mostra a região com aria-busy, sem quebrar', () => {
    dev.apiRequest.mockReturnValue(new Promise(() => undefined));
    renderizar();
    const secao = document.getElementById('titulo-excecoes')?.closest('section');
    expect(secao?.getAttribute('aria-busy')).toBe('true');
  });

  it('pronto e vazio: diz que não há pendência crítica', async () => {
    renderizar();
    await esperar();
    expect(document.body.textContent).toContain('Nenhuma pendência crítica no momento.');
  });

  it('pronto com avisos: mostra a fila de crédito com o detalhe de tempo', async () => {
    const agora = Date.now();
    credito.listarFilaDeAnalise.mockResolvedValue([
      { pedido: { enviadoEm: new Date(agora - 3 * 3_600_000).toISOString() } },
      { pedido: { enviadoEm: new Date(agora - 1 * 3_600_000).toISOString() } },
    ]);
    renderizar();
    await esperar();
    expect(document.body.textContent).toContain('Pedidos aguardando análise de crédito');
    expect(document.body.textContent).toContain('1 acima de 2h');
    const linha = [...caixa.querySelectorAll('a')].find((a) =>
      a.textContent?.includes('Pedidos aguardando análise de crédito'),
    );
    expect(linha?.getAttribute('href')).toBe('/vendas/analise-de-credito');
  });

  it('falha parcial: mostra o que sabe e avisa de forma discreta, sem virar erro geral', async () => {
    dev.apiRequest.mockImplementation((caminho: string) => {
      if (caminho.startsWith('/analytics/dashboard')) return Promise.resolve(painelPronto);
      if (caminho.startsWith('/inventory/lots')) return Promise.resolve({ items: [] });
      return Promise.reject(new Error('fiscal fora do ar'));
    });
    credito.listarFilaDeAnalise.mockResolvedValue([
      { pedido: { enviadoEm: new Date().toISOString() } },
    ]);
    renderizar();
    await esperar();
    expect(document.body.textContent).toContain('Pedidos aguardando análise de crédito');
    expect(document.body.textContent).toContain(
      'Algumas informações podem estar indisponíveis agora.',
    );
    expect(document.body.textContent).not.toContain('Não foi possível carregar os avisos agora.');
  });

  it('falha total: todas as fontes rejeitam, mostra erro e o retry refaz a carga', async () => {
    dev.apiRequest.mockRejectedValue(new Error('fora do ar'));
    credito.listarFilaDeAnalise.mockRejectedValue(new Error('fora do ar'));
    renderizar();
    await esperar();
    expect(document.body.textContent).toContain('Não foi possível carregar os avisos agora.');

    dev.apiRequest.mockImplementation((caminho: string) => {
      if (caminho.startsWith('/analytics/dashboard')) return Promise.resolve(painelPronto);
      if (caminho.startsWith('/inventory/lots')) return Promise.resolve({ items: [] });
      if (caminho.startsWith('/fiscal/mdfe')) return Promise.resolve([]);
      return Promise.reject(new Error('?'));
    });
    credito.listarFilaDeAnalise.mockResolvedValue([]);
    const botao = [...caixa.querySelectorAll('button')].find((b) =>
      b.textContent?.includes('Tentar de novo'),
    );
    act(() => botao?.click());
    await esperar();
    expect(document.body.textContent).toContain('Nenhuma pendência crítica no momento.');
  });
});

describe('HomeScreen — acesso rápido', () => {
  it('lista em ordem, numerada, com o atalho de teclado quando existe', async () => {
    renderizar();
    await esperar();
    const linhas = [
      ...caixa
        .querySelectorAll('#titulo-acesso-rapido')[0]!
        .closest('section')!
        .querySelectorAll('a'),
    ];
    expect(linhas[0]?.textContent).toContain('01');
    expect(linhas[0]?.textContent).toContain('Análise de Crédito');
    expect(linhas[0]?.textContent).toContain('Ctrl+I');
    // "Painel de Controle" sempre por último, mesmo não vindo do menu.
    expect(linhas.at(-1)?.textContent).toContain('Painel de Controle');
  });
});
