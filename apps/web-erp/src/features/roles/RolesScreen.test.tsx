import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { RoleView } from './roles.api';

/** Fase 6.4 — piloto da Decision Grammar: `window.confirm` virou um Dialogo
 *  assíncrono aqui porque este era o caso mais simples dos nove (sem atalho
 *  de teclado, sem outra sobreposição concorrente, `remover` já era async).
 *  Estes testes travam a paridade exigida pela fase: cancelar não faz nada,
 *  confirmar chama exatamente a mesma sequência de antes (excluirCargo +
 *  recarregar a lista), e Escape se comporta como cancelar. */

const api = vi.hoisted(() => ({
  listarCargos: vi.fn(),
  criarCargo: vi.fn(),
  salvarCargo: vi.fn(),
  excluirCargo: vi.fn(),
}));
vi.mock('./roles.api', () => api);

import { RolesScreen } from './RolesScreen';

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

let raiz: Root;
let caixa: HTMLDivElement;
const montar = (conteudo: React.ReactNode) => act(() => raiz.render(conteudo));
const esperar = async () => {
  await act(async () => {
    await new Promise((resolver) => setTimeout(resolver, 0));
  });
};

const CARGO: RoleView = {
  id: 'cargo-1',
  name: 'Supervisor Regional',
  systemKey: null,
  isCustom: true,
  permissions: [{ permission: 'estoque.visualizar' }],
};

beforeEach(() => {
  caixa = document.createElement('div');
  document.body.appendChild(caixa);
  raiz = createRoot(caixa);
  api.listarCargos.mockReset().mockResolvedValue([CARGO]);
  api.excluirCargo.mockReset().mockResolvedValue({ removed: true });
});

afterEach(() => {
  act(() => raiz.unmount());
  caixa.remove();
  document.body.querySelectorAll('[role="dialog"]').forEach((el) => el.remove());
});

const clicar = (elemento: Element | null | undefined) =>
  act(() => elemento?.dispatchEvent(new MouseEvent('click', { bubbles: true })));

const botao = (texto: string) =>
  [...document.body.querySelectorAll('button')].find((b) => b.textContent?.trim() === texto);

describe('RolesScreen — confirmação de exclusão de cargo', () => {
  it('clicar em "Excluir" abre o Dialogo sem excluir nada ainda', async () => {
    montar(<RolesScreen />);
    await esperar();

    clicar(botao('Excluir'));
    await esperar();

    const dialogo = document.body.querySelector('[role="dialog"]');
    expect(dialogo).not.toBeNull();
    expect(dialogo?.textContent).toMatch(/Excluir "Supervisor Regional"/);
    expect(api.excluirCargo).not.toHaveBeenCalled();
  });

  it('Fase 7 §1 — foco inicial fica em "Cancelar", não na ação destrutiva', async () => {
    // jsdom não simula o comportamento nativo do navegador de "Enter aciona
    // o botão focado" — por isso o teste trava o que é realmente testável
    // aqui: QUAL botão recebe o foco inicial. Num navegador real, um botão
    // focado responde a Enter como um clique; garantir que o foco pousa em
    // "Cancelar" é o que impede um Enter acidental de excluir o cargo.
    montar(<RolesScreen />);
    await esperar();

    clicar(botao('Excluir'));
    await esperar();

    expect(document.activeElement?.textContent?.trim()).toBe('Cancelar');
    expect(document.activeElement).not.toBe(botao('Excluir cargo'));
  });

  it('Cancelar fecha o Dialogo e não chama excluirCargo', async () => {
    montar(<RolesScreen />);
    await esperar();
    clicar(botao('Excluir'));
    await esperar();

    clicar(botao('Cancelar'));
    await esperar();

    expect(document.body.querySelector('[role="dialog"]')).toBeNull();
    expect(api.excluirCargo).not.toHaveBeenCalled();
  });

  it('Escape se comporta como Cancelar', async () => {
    montar(<RolesScreen />);
    await esperar();
    clicar(botao('Excluir'));
    await esperar();

    act(() => {
      document.dispatchEvent(
        new KeyboardEvent('keydown', { key: 'Escape', bubbles: true, cancelable: true }),
      );
    });
    await esperar();

    expect(document.body.querySelector('[role="dialog"]')).toBeNull();
    expect(api.excluirCargo).not.toHaveBeenCalled();
  });

  it('confirmar chama excluirCargo com o id certo e recarrega a lista', async () => {
    montar(<RolesScreen />);
    await esperar();
    clicar(botao('Excluir'));
    await esperar();
    api.listarCargos.mockClear();

    clicar(botao('Excluir cargo'));
    await esperar();

    expect(api.excluirCargo).toHaveBeenCalledWith('cargo-1');
    expect(api.listarCargos).toHaveBeenCalledTimes(1);
    expect(document.body.querySelector('[role="dialog"]')).toBeNull();
  });

  it('falha ao excluir mostra o erro da página, sem deixar o Dialogo aberto', async () => {
    api.excluirCargo.mockRejectedValue(new Error('Cargo em uso'));
    montar(<RolesScreen />);
    await esperar();
    clicar(botao('Excluir'));
    await esperar();

    clicar(botao('Excluir cargo'));
    await esperar();

    expect(document.body.querySelector('[role="dialog"]')).toBeNull();
    expect(caixa.querySelector('[role="alert"]')?.textContent).toBe('Cargo em uso');
  });
});
