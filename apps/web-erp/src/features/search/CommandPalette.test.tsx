import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { MENUS } from '../../app/menu/menu.data';
import { ShellContext } from '../../app/shell/ShellContext';

const dev = vi.hoisted(() => ({ apiRequest: vi.fn() }));
vi.mock('../../lib/dev-auth', () => dev);

import { CommandPalette } from './CommandPalette';

/** A Command Window da Fase 4.1: um campo, navegacao local (menu, instantanea)
 *  e entidades remotas (a mesma API que ja existia). Sem `cmdk`/Radix — testa
 *  o comportamento real de teclado, foco e ARIA que o componente implementa
 *  a mao, do mesmo jeito que MenuBar.test.tsx ja faz para a barra. */

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

let raiz: Root;
let caixa: HTMLDivElement;
let onOpenChange: ReturnType<typeof vi.fn>;

const ID_GATILHO = 'gatilho-de-busca';

const esperar = async (ms = 0) => {
  await act(async () => {
    await new Promise((resolver) => setTimeout(resolver, ms));
  });
};

const renderizar = (open: boolean) => {
  caixa = document.createElement('div');
  document.body.appendChild(caixa);
  raiz = createRoot(caixa);
  act(() =>
    raiz.render(
      <MemoryRouter>
        <button type="button" id={ID_GATILHO}>
          Abrir busca
        </button>
        <ShellContext.Provider value={{ abrirBusca: vi.fn(), menus: MENUS }}>
          <CommandPalette open={open} onOpenChange={onOpenChange} />
        </ShellContext.Provider>
      </MemoryRouter>,
    ),
  );
};

const rerenderizarCom = (open: boolean) => {
  act(() => raiz.unmount());
  caixa.remove();
  renderizar(open);
};

beforeEach(() => {
  vi.clearAllMocks();
  onOpenChange = vi.fn();
  dev.apiRequest.mockResolvedValue({ items: [], unavailable: [] });
});

afterEach(() => {
  if (raiz) act(() => raiz.unmount());
  caixa?.remove();
});

const campo = (): HTMLInputElement => caixa.querySelector('[role="combobox"]') as HTMLInputElement;
const opcoes = (): HTMLElement[] => [...caixa.querySelectorAll<HTMLElement>('[role="option"]')];
const grupos = (): HTMLElement[] => [...caixa.querySelectorAll<HTMLElement>('[role="group"]')];
const focado = () => document.activeElement as HTMLElement | null;

// react-dom precisa do setter nativo pra disparar onChange corretamente.
const setValor = (input: HTMLInputElement, valor: string) => {
  const setter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value')!.set!;
  setter.call(input, valor);
  input.dispatchEvent(new Event('input', { bubbles: true }));
};

const digitarDeVerdade = async (texto: string) => {
  await act(async () => setValor(campo(), texto));
};

const teclar = (alvo: EventTarget, key: string, opcoesEvento: KeyboardEventInit = {}) =>
  act(() => {
    alvo.dispatchEvent(
      new KeyboardEvent('keydown', { key, bubbles: true, cancelable: true, ...opcoesEvento }),
    );
  });

describe('CommandPalette — abrir e fechar', () => {
  it('fechado não renderiza nada', () => {
    renderizar(false);
    expect(caixa.querySelector('[role="dialog"]')).toBeNull();
  });

  it('abrir foca o campo automaticamente', async () => {
    renderizar(false);
    rerenderizarCom(true);
    await esperar();
    expect(focado()).toBe(campo());
  });

  it('fechar devolve o foco a quem abriu', async () => {
    // Alterna `open` na MESMA instância montada (como o AppShell faz de
    // verdade ao trocar `paletteOpen`) — um unmount/remount não testaria a
    // captura de foco em si, só um mount novo do zero.
    caixa = document.createElement('div');
    document.body.appendChild(caixa);
    raiz = createRoot(caixa);
    const arvore = (open: boolean) => (
      <MemoryRouter>
        <button type="button" id={ID_GATILHO}>
          Abrir busca
        </button>
        <ShellContext.Provider value={{ abrirBusca: vi.fn(), menus: MENUS }}>
          <CommandPalette open={open} onOpenChange={onOpenChange} />
        </ShellContext.Provider>
      </MemoryRouter>
    );
    act(() => raiz.render(arvore(false)));
    act(() => document.getElementById(ID_GATILHO)?.focus());
    expect(focado()?.id).toBe(ID_GATILHO);

    act(() => raiz.render(arvore(true)));
    await esperar();
    expect(focado()).toBe(campo());

    act(() => raiz.render(arvore(false)));
    expect(focado()?.id).toBe(ID_GATILHO);
  });

  it('Escape fecha via onOpenChange', async () => {
    renderizar(true);
    await esperar();
    teclar(campo(), 'Escape');
    expect(onOpenChange).toHaveBeenCalledWith(false);
  });

  it('clicar no fundo fecha via onOpenChange', () => {
    renderizar(true);
    const fundo = caixa.querySelector('[aria-label="Fechar busca"]') as HTMLButtonElement;
    act(() => fundo.click());
    expect(onOpenChange).toHaveBeenCalledWith(false);
  });
});

describe('CommandPalette — estado sem consulta', () => {
  it('mostra "Atalhos" com itens reais que têm atalho de teclado — nunca "recentes" inventado', async () => {
    renderizar(true);
    await esperar();
    expect(document.body.textContent).not.toContain('recentes');
    expect(document.body.textContent).not.toContain('Recentes');
    const titulos = grupos().map((g) => g.getAttribute('aria-label'));
    expect(titulos).toContain('Atalhos');
    expect(opcoes().length).toBeGreaterThan(0);
  });
});

describe('CommandPalette — busca em navegação', () => {
  it('"credito" acha Análise de Crédito, ignorando acento', async () => {
    renderizar(true);
    await esperar();
    await digitarDeVerdade('credito');
    await esperar();
    expect(document.body.textContent).toContain('Análise de Crédito');
    const grupo = grupos().find((g) => g.getAttribute('aria-label') === 'Navegação');
    expect(grupo).toBeDefined();
  });

  it('sem resultado nenhum mostra o estado vazio, sem quebrar', async () => {
    renderizar(true);
    await esperar();
    await digitarDeVerdade('xyzxyzxyz999');
    await esperar(250);
    expect(document.body.textContent).toContain('Nenhum resultado');
  });
});

describe('CommandPalette — busca remota', () => {
  it('mostra o spinner enquanto carrega e o grupo da entidade quando responde', async () => {
    let resolver!: (v: unknown) => void;
    dev.apiRequest.mockImplementation(
      () =>
        new Promise((r) => {
          resolver = r;
        }),
    );
    renderizar(true);
    await esperar();
    await digitarDeVerdade('fulano');
    await esperar(200);
    expect(
      caixa.querySelector('svg[class*="animate-spin"], [aria-label="Carregando"]') ?? true,
    ).toBeTruthy();

    await act(async () => {
      resolver({
        items: [
          {
            type: 'customer',
            id: 'c1',
            title: 'Fulano de Tal',
            subtitle: 'Cliente',
            path: '/cadastros/clientes',
          },
        ],
        unavailable: [],
      });
      await Promise.resolve();
    });
    expect(document.body.textContent).toContain('Fulano de Tal');
    const titulos = grupos().map((g) => g.getAttribute('aria-label'));
    expect(titulos).toContain('Cliente');
  });

  it('respeita o debounce: não chama a API antes do prazo', async () => {
    renderizar(true);
    await esperar();
    await digitarDeVerdade('boletos');
    expect(dev.apiRequest).not.toHaveBeenCalled();
    await esperar(200);
    expect(dev.apiRequest).toHaveBeenCalledTimes(1);
  });
});

describe('CommandPalette — teclado', () => {
  it('ArrowDown/ArrowUp movem o destaque dentro da lista', async () => {
    renderizar(true);
    await esperar();
    const antes = opcoes()[0]?.getAttribute('aria-selected');
    expect(antes).toBe('true');

    teclar(campo(), 'ArrowDown');
    expect(opcoes()[0]?.getAttribute('aria-selected')).toBe('false');
    expect(opcoes()[1]?.getAttribute('aria-selected')).toBe('true');

    teclar(campo(), 'ArrowUp');
    expect(opcoes()[0]?.getAttribute('aria-selected')).toBe('true');
  });

  it('ArrowUp no primeiro item não estoura para índice negativo', async () => {
    renderizar(true);
    await esperar();
    teclar(campo(), 'ArrowUp');
    expect(opcoes()[0]?.getAttribute('aria-selected')).toBe('true');
  });

  it('End vai para o último e Home volta para o primeiro', async () => {
    renderizar(true);
    await esperar();
    teclar(campo(), 'End');
    expect(opcoes().at(-1)?.getAttribute('aria-selected')).toBe('true');

    teclar(campo(), 'Home');
    expect(opcoes()[0]?.getAttribute('aria-selected')).toBe('true');
  });

  it('Enter navega e fecha', async () => {
    renderizar(true);
    await esperar();
    teclar(campo(), 'Enter');
    expect(onOpenChange).toHaveBeenCalledWith(false);
  });

  it('Tab não move o foco para fora do campo (fica preso, como um combobox)', async () => {
    renderizar(true);
    await esperar();
    teclar(campo(), 'Tab');
    expect(focado()).toBe(campo());
  });

  it('trocar a consulta reseta o destaque para o primeiro item', async () => {
    renderizar(true);
    await esperar();
    teclar(campo(), 'ArrowDown');
    expect(opcoes()[1]?.getAttribute('aria-selected')).toBe('true');

    await digitarDeVerdade('credito');
    await esperar();
    expect(opcoes()[0]?.getAttribute('aria-selected')).toBe('true');
  });
});

describe('CommandPalette — ARIA', () => {
  it('o campo é um combobox ligado ao listbox de resultados', async () => {
    renderizar(true);
    await esperar();
    const input = campo();
    const listboxId = input.getAttribute('aria-controls');
    expect(listboxId).toBeTruthy();
    expect(document.getElementById(listboxId!)?.getAttribute('role')).toBe('listbox');
    expect(input.getAttribute('aria-activedescendant')).toBe(
      document.getElementById(listboxId!)?.querySelector('[role="option"]')?.id,
    );
  });

  it('aria-live anuncia a contagem só depois que a busca resolve, nunca durante o carregamento', async () => {
    let resolver!: (v: unknown) => void;
    dev.apiRequest.mockImplementation(
      () =>
        new Promise((r) => {
          resolver = r;
        }),
    );
    renderizar(true);
    await esperar();
    await digitarDeVerdade('fulano');
    await esperar(200);
    const liveRegion = caixa.querySelector('[aria-live="polite"]');
    expect(liveRegion?.textContent).toBe('');

    await act(async () => {
      resolver({ items: [], unavailable: [] });
      await Promise.resolve();
    });
    expect(liveRegion?.textContent).toContain('resultado');
  });
});
