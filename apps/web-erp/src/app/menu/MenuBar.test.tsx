import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { MENUS } from './menu.data';
import { ID_CONTEUDO_PRINCIPAL } from './menu.utils';
import { MenuBar } from './MenuBar';

/** O comportamento de barra de aplicação que o Synapse já tem, registrado antes
 *  de a Fase 3 mexer na aparência: F10 leva o foco à barra, as setas andam entre
 *  módulos e itens, Esc fecha devolvendo o foco a quem abriu, e com um menu
 *  aberto o mouse troca de menu ao passar no vizinho.
 *
 *  Os três defeitos de foco vistos na auditoria — Tab com menu aberto, troca por
 *  hover focando o painel inteiro e seta lateral caindo num índice que não é o
 *  do módulo aberto — foram corrigidos nesta fase; os testes abaixo protegem
 *  cada um deles. */

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

let raiz: Root;
let caixa: HTMLDivElement;

const renderizar = (caminhoAtual = '/rota-sem-modulo') => {
  caixa = document.createElement('div');
  document.body.appendChild(caixa);
  raiz = createRoot(caixa);
  act(() =>
    raiz.render(
      <MemoryRouter>
        {/* Alvo de foco que o AppShell de verdade fornece ao redor do <Outlet/>. */}
        <div id={ID_CONTEUDO_PRINCIPAL} tabIndex={-1} />
        <MenuBar menus={MENUS} caminhoAtual={caminhoAtual} onSair={vi.fn()} />
      </MemoryRouter>,
    ),
  );
};

const rerenderizarCom = (caminhoAtual: string) => {
  act(() => raiz.unmount());
  caixa.remove();
  renderizar(caminhoAtual);
};

beforeEach(() => renderizar());

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

const itemPorTexto = (painel: HTMLElement, rotulo: string): HTMLElement => {
  const achado = [...painel.querySelectorAll<HTMLElement>('[role="menuitem"]')].find((el) =>
    el.textContent?.trim().startsWith(rotulo),
  );
  if (!achado) throw new Error(`item "${rotulo}" nao encontrado no painel`);
  return achado;
};

const teclar = (alvo: EventTarget, key: string, opcoes: KeyboardEventInit = {}) =>
  act(() => {
    alvo.dispatchEvent(new KeyboardEvent('keydown', { key, bubbles: true, ...opcoes }));
  });

/** React monta `onMouseEnter` a partir de `mouseover`: o evento cru de entrada
 *  nao chega ao componente. Cada chamada usa uma coordenada nova: a barra
 *  distingue hover de verdade de um painel que apareceu sob o cursor parado
 *  comparando `clientX/clientY` com a ultima posicao vista (`moveuDeVerdade`,
 *  em menu.utils.ts) — sem isso, todo `passarOMouse` cairia na mesma
 *  coordenada (0,0) e pareceria o cursor parado. */
let proximaCoordenadaDoMouse = 1;
const passarOMouse = (alvo: Element) =>
  act(() => {
    const coordenada = proximaCoordenadaDoMouse++;
    alvo.dispatchEvent(
      new MouseEvent('mouseover', { bubbles: true, clientX: coordenada, clientY: coordenada }),
    );
  });

/** Para testar especificamente que um hover SEM deslocamento real (repete a
 *  ultima coordenada de verdade) e ignorado — o cenario do painel que aparece
 *  sob o cursor parado, ou o cursor "parado" continuando sobre outro elemento
 *  depois que o layout mudou. */
const passarOMouseNaUltimaCoordenada = (alvo: Element) =>
  act(() => {
    const coordenada = proximaCoordenadaDoMouse - 1;
    alvo.dispatchEvent(
      new MouseEvent('mouseover', { bubbles: true, clientX: coordenada, clientY: coordenada }),
    );
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

describe('MenuBar — módulo ativo', () => {
  it('marca com a linha de módulo ativo o módulo dono da rota atual, sem precisar abrir nada', () => {
    rerenderizarCom('/vendas/venda-balcao');
    const linhaDeVendas = botaoDoModulo('Vendas').querySelector('[data-indicador-de-modulo]');
    const linhaDeCadastros = botaoDoModulo('Cadastros').querySelector('[data-indicador-de-modulo]');
    expect(linhaDeVendas?.className).toContain('bg-primary');
    expect(linhaDeCadastros?.className).not.toContain('bg-primary');
  });

  it('rota sem módulo dono não acende nenhuma linha', () => {
    const linhas = botoesDaBarra().map(
      (botao) => botao.querySelector('[data-indicador-de-modulo]')?.className ?? '',
    );
    expect(linhas.some((classe) => classe.includes('bg-primary'))).toBe(false);
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

  it('Home e End na barra vão direto para o primeiro e o último módulo', () => {
    act(() => botaoDoModulo('Financeiro').focus());
    teclar(focado() as HTMLElement, 'End');
    expect(focado()?.textContent?.trim()).toBe('Suporte');

    teclar(focado() as HTMLElement, 'Home');
    expect(focado()?.textContent?.trim()).toBe('Cadastros');
  });

  it('seta para baixo abre o menu e já foca um item — nunca o painel inteiro', () => {
    act(() => botaoDoModulo('Vendas').focus());
    teclar(focado() as HTMLElement, 'ArrowDown');

    expect(paineis()).toHaveLength(1);
    expect(paineis()[0]?.getAttribute('aria-label')).toBe('Vendas');
    expect(botaoDoModulo('Vendas').getAttribute('aria-expanded')).toBe('true');
    expect(focado()?.getAttribute('role')).toBe('menuitem');
    expect(focado()).not.toBe(paineis()[0]);
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

  it('Home e End dentro do painel vão para o primeiro e o último item navegável', () => {
    act(() => botaoDoModulo('Financeiro').click());
    const painel = paineis()[0] as HTMLElement;
    teclar(focado() as HTMLElement, 'End');
    const ultimoTexto = focado()?.textContent;
    expect(ultimoTexto).toBeTruthy();
    expect(focado()?.closest('[role="menu"]')).toBe(painel);

    teclar(focado() as HTMLElement, 'Home');
    expect(focado()?.textContent).toContain('Contas a Pagar');
  });

  it('digitar uma letra pula para o item cujo rótulo começa com ela (type-ahead)', () => {
    act(() => botaoDoModulo('Cadastros').click());
    teclar(focado() as HTMLElement, 't');
    expect(focado()?.textContent).toContain('Transportadoras');
  });

  it('separador nunca recebe foco nem índice navegável', () => {
    act(() => botaoDoModulo('Financeiro').click());
    const painel = paineis()[0] as HTMLElement;
    const separadores = [...painel.querySelectorAll('[role="separator"]')];
    expect(separadores.length).toBeGreaterThan(0);
    for (const separador of separadores) {
      expect(separador.hasAttribute('data-indice')).toBe(false);
      expect(separador.getAttribute('tabindex')).toBeNull();
    }
  });
});

describe('MenuBar — bug: Tab com o menu aberto', () => {
  it('Tab fecha tudo e vai para o conteúdo da rota — nunca solta o foco no body', () => {
    act(() => botaoDoModulo('Cadastros').click());
    expect(paineis()).toHaveLength(1);

    teclar(focado() as HTMLElement, 'Tab');
    expect(paineis()).toHaveLength(0);
    expect(focado()?.id).toBe(ID_CONTEUDO_PRINCIPAL);
    expect(focado()).not.toBe(document.body);
  });

  it('Shift+Tab fecha tudo e devolve o foco ao módulo que estava aberto', () => {
    act(() => botaoDoModulo('Estoque').click());
    teclar(focado() as HTMLElement, 'Tab', { shiftKey: true });
    expect(paineis()).toHaveLength(0);
    expect(focado()?.textContent?.trim()).toBe('Estoque');
  });

  it('Tab também sai de dentro de um submenu, não só do primeiro nível', () => {
    act(() => botaoDoModulo('Cadastros').click());
    const clientes = itemPorTexto(paineis()[0] as HTMLElement, 'Clientes');
    passarOMouse(clientes);
    expect(paineis()).toHaveLength(2);

    teclar(focado() as HTMLElement, 'Tab');
    expect(paineis()).toHaveLength(0);
    expect(focado()?.id).toBe(ID_CONTEUDO_PRINCIPAL);
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
    const clientes = itemPorTexto(paineis()[0] as HTMLElement, 'Clientes');

    passarOMouse(clientes);
    expect(paineis()).toHaveLength(2);
    expect(paineis()[1]?.getAttribute('aria-label')).toBe('Clientes');
    expect(clientes.getAttribute('aria-expanded')).toBe('true');
  });
});

describe('MenuBar — bug: hover não pode focar o painel inteiro', () => {
  it('abrir por hover foca um item específico — um leitor de tela não recebe o painel como uma string só', () => {
    act(() => botaoDoModulo('Cadastros').click());
    passarOMouse(botaoDoModulo('Financeiro'));

    expect(paineis()).toHaveLength(1);
    expect(focado()?.getAttribute('role')).toBe('menuitem');
    expect(focado()).not.toBe(paineis()[0]);
  });
});

describe('MenuBar — bug: seta lateral não pode cair num índice de outro contexto', () => {
  it('voltar do submenu foca quem o abriu, mesmo quando ele foi aberto por clique direto (sem passar pelo destaque do pai antes)', () => {
    act(() => botaoDoModulo('Cadastros').click());
    const painelDeCadastros = paineis()[0] as HTMLElement;
    // Ao abrir, o destaque do pai fica no primeiro item ("Parâmetros da
    // Empresa" — índice 0), não em "Clientes" (índice 9).
    expect(focado()?.textContent).toContain('Parâmetros da Empresa');

    // Clique direto no gatilho do submenu, sem passar o mouse antes: e o
    // caminho que nao sincronizava o destaque do pai com o item que abriu o
    // submenu — a raiz do defeito.
    const clientes = itemPorTexto(painelDeCadastros, 'Clientes');
    act(() => clientes.click());
    expect(paineis()).toHaveLength(2);

    // Volta do submenu pela seta lateral, a partir do primeiro item dele.
    teclar(focado() as HTMLElement, 'ArrowLeft');

    expect(paineis()).toHaveLength(1);
    // Tem que focar e destacar quem abriu o submenu (Clientes) — nao o item
    // que estava destacado antes (Parâmetros da Empresa).
    expect(focado()?.textContent).toContain('Clientes');

    // E a navegação daqui pra frente é relativa ao item certo: o próximo
    // depois de Clientes é Fornecedores, não Financeiro (índice 1, o que
    // viria depois do destaque antigo e errado).
    teclar(focado() as HTMLElement, 'ArrowDown');
    expect(focado()?.textContent).toContain('Fornecedores');
  });
});

describe('MenuBar — mouse e teclado juntos', () => {
  it('mouse parado sobre outro módulo depois de navegar por teclado não atrapalha a sequência', () => {
    teclar(document, 'F10');
    teclar(focado() as HTMLElement, 'ArrowDown');
    expect(paineis()[0]?.getAttribute('aria-label')).toBe('Cadastros');

    passarOMouse(botaoDoModulo('Estoque'));
    expect(paineis()[0]?.getAttribute('aria-label')).toBe('Estoque');

    teclar(focado() as HTMLElement, 'ArrowDown');
    expect(focado()?.closest('[role="menu"]')?.getAttribute('aria-label')).toBe('Estoque');

    teclar(focado() as HTMLElement, 'Escape');
    expect(paineis()).toHaveLength(0);
    expect(focado()?.textContent?.trim()).toBe('Estoque');
  });

  it('mouse parado na mesma coordenada de antes não rouba o destaque de quem está navegando por teclado', () => {
    teclar(document, 'F10');
    teclar(focado() as HTMLElement, 'ArrowDown');
    expect(paineis()[0]?.getAttribute('aria-label')).toBe('Cadastros');

    // Uma posição real do mouse fica registrada.
    passarOMouse(botaoDoModulo('Estoque'));
    expect(paineis()[0]?.getAttribute('aria-label')).toBe('Estoque');

    teclar(focado() as HTMLElement, 'ArrowDown');
    const focoDeQuemNavegaPorTeclado = focado();

    // O layout muda (o painel de Estoque tem outro tamanho) e o cursor,
    // parado na MESMA coordenada de antes, passa a estar sobre Cadastros —
    // sem o usuário ter mexido o mouse de verdade.
    passarOMouseNaUltimaCoordenada(botaoDoModulo('Cadastros'));

    // Nem o painel aberto nem o foco de quem navega por teclado mudam.
    expect(paineis()[0]?.getAttribute('aria-label')).toBe('Estoque');
    expect(focado()).toBe(focoDeQuemNavegaPorTeclado);
  });
});
