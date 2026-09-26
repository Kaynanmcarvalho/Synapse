import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { MENUS } from './menu.data';
import { MenuBar } from './MenuBar';

/** O comportamento de barra de aplicação que o Synapse já tem, registrado antes
 *  de a Fase 3 mexer na aparência: F10 leva o foco à barra, as setas andam entre
 *  módulos e itens, Esc fecha devolvendo o foco a quem abriu, e com um menu
 *  aberto o mouse troca de menu ao passar no vizinho.
 *
 *  Os três defeitos de foco vistos na auditoria (Tab com menu aberto, troca por
 *  hover focando o painel e seta lateral caindo no meio da lista) são conhecidos
 *  e ficam para a Fase 3 — este teste protege o que deve continuar funcionando. */

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

let raiz: Root;
let caixa: HTMLDivElement;

beforeEach(() => {
  caixa = document.createElement('div');
  document.body.appendChild(caixa);
  raiz = createRoot(caixa);
  act(() =>
    raiz.render(
      <MemoryRouter>
        <MenuBar menus={MENUS} onSair={vi.fn()} />
      </MemoryRouter>,
    ),
  );
});

afterEach(() => {
  act(() => raiz.unmount());
  caixa.remove();
});

const botoesDaBarra = (): HTMLButtonElement[] =>
  [...document.querySelectorAll('[role="menubar"] [role="menuitem"]')] as HTMLButtonElement[];

const botaoDoModulo = (rotulo: string): HTMLButtonElement => {
  const achado = botoesDaBarra().find((botao) => botao.textContent?.trim().startsWith(rotulo));
  if (!achado) throw new Error(`modulo "${rotulo}" nao encontrado na barra`);
  return achado;
};

const paineis = (): HTMLElement[] => [...document.querySelectorAll<HTMLElement>('[role="menu"]')];

const teclar = (alvo: EventTarget, key: string) =>
  act(() => {
    alvo.dispatchEvent(new KeyboardEvent('keydown', { key, bubbles: true }));
  });

/** React monta `onMouseEnter` a partir de `mouseover`: o evento cru de entrada
 *  nao chega ao componente. */
const passarOMouse = (alvo: Element) =>
  act(() => {
    alvo.dispatchEvent(new MouseEvent('mouseover', { bubbles: true }));
  });

const focado = () => document.activeElement as HTMLElement | null;

describe('MenuBar — estrutura', () => {
  it('mostra os nove módulos na ordem do Syndata, e o Sair fora da lista', () => {
    expect(botoesDaBarra().map((botao) => botao.textContent?.trim())).toEqual([
      'Cadastros',
      'Vendas',
      'Estoque',
      'Financeiro',
      'Produtividade',
      'Rotinas Fiscais',
      'Configurações',
      'Ferramentas',
      'Suporte',
    ]);
    const sair = [...caixa.querySelectorAll('button')].find(
      (botao) => botao.textContent?.trim() === 'Sair',
    );
    expect(sair).toBeDefined();
    expect(sair?.getAttribute('role')).toBeNull();
  });

  it('cada módulo se anuncia como menu que abre painel', () => {
    const cadastros = botaoDoModulo('Cadastros');
    expect(cadastros.getAttribute('aria-haspopup')).toBe('menu');
    expect(cadastros.getAttribute('aria-expanded')).toBe('false');
  });
});

describe('MenuBar — teclado', () => {
  it('F10 leva o foco para a barra, como no Windows', () => {
    teclar(document, 'F10');
    expect(focado()?.textContent?.trim()).toBe('Cadastros');
  });

  it('setas laterais andam entre os módulos e dão a volta', () => {
    act(() => botaoDoModulo('Cadastros').focus());
    teclar(focado() as HTMLElement, 'ArrowRight');
    expect(focado()?.textContent?.trim()).toBe('Vendas');

    teclar(focado() as HTMLElement, 'ArrowLeft');
    expect(focado()?.textContent?.trim()).toBe('Cadastros');

    teclar(focado() as HTMLElement, 'ArrowLeft');
    expect(focado()?.textContent?.trim()).toBe('Suporte');
  });

  it('seta para baixo abre o menu e já foca o primeiro item', () => {
    act(() => botaoDoModulo('Vendas').focus());
    teclar(focado() as HTMLElement, 'ArrowDown');

    expect(paineis()).toHaveLength(1);
    expect(paineis()[0]?.getAttribute('aria-label')).toBe('Vendas');
    expect(botaoDoModulo('Vendas').getAttribute('aria-expanded')).toBe('true');
    expect(focado()?.textContent).toContain('Venda Balcão');
  });

  it('Esc fecha o menu e devolve o foco ao módulo que o abriu', () => {
    act(() => botaoDoModulo('Estoque').focus());
    teclar(focado() as HTMLElement, 'ArrowDown');
    expect(paineis()).toHaveLength(1);

    teclar(focado() as HTMLElement, 'Escape');
    expect(paineis()).toHaveLength(0);
    expect(focado()?.textContent?.trim()).toBe('Estoque');
  });

  it('Esc no botão do módulo não deixa nada aberto', () => {
    act(() => botaoDoModulo('Financeiro').focus());
    teclar(focado() as HTMLElement, 'Enter');
    expect(paineis()).toHaveLength(1);

    teclar(botaoDoModulo('Financeiro'), 'Escape');
    expect(paineis()).toHaveLength(0);
  });
});

describe('MenuBar — mouse', () => {
  it('clicar abre e clicar de novo fecha', () => {
    act(() => botaoDoModulo('Cadastros').click());
    expect(paineis()).toHaveLength(1);

    act(() => botaoDoModulo('Cadastros').click());
    expect(paineis()).toHaveLength(0);
  });

  it('com um menu aberto, passar o mouse no vizinho troca de menu', () => {
    act(() => botaoDoModulo('Cadastros').click());
    expect(paineis()[0]?.getAttribute('aria-label')).toBe('Cadastros');

    passarOMouse(botaoDoModulo('Financeiro'));
    expect(paineis()).toHaveLength(1);
    expect(paineis()[0]?.getAttribute('aria-label')).toBe('Financeiro');
  });

  it('com a barra fechada, passar o mouse não abre nada', () => {
    passarOMouse(botaoDoModulo('Vendas'));
    expect(paineis()).toHaveLength(0);
  });

  it('o submenu abre ao lado, sem fechar o menu que o contém', () => {
    act(() => botaoDoModulo('Cadastros').click());
    const clientes = [...(paineis()[0]?.querySelectorAll('[role="menuitem"]') ?? [])].find(
      (item) => item.textContent?.trim() === 'Clientes',
    );
    expect(clientes).toBeDefined();

    passarOMouse(clientes as Element);
    expect(paineis()).toHaveLength(2);
    expect(paineis()[1]?.getAttribute('aria-label')).toBe('Clientes');
    expect(clientes?.getAttribute('aria-expanded')).toBe('true');
  });
});
