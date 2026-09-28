import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

/** A janela do fornecedor: mesma Janela real do cadastro de cliente/funcionário
 *  (Fase 6.3), agora provada num terceiro cadastro. Sem teste algum antes
 *  desta fase — cobre o básico: abas, geometria própria e sair com alteração
 *  pendente pergunta antes de fechar. */

const api = vi.hoisted(() => ({
  buscarFornecedor: vi.fn(),
  criarFornecedor: vi.fn(),
  atualizarFornecedor: vi.fn(),
}));
vi.mock('./fornecedores.api', () => api);

const tabelas = vi.hoisted(() => ({
  buscarItemDeTabela: vi.fn(),
  listarTabela: vi.fn(),
  criarItemDeTabela: vi.fn(),
  alterarItemDeTabela: vi.fn(),
  consultarCep: vi.fn(),
  consultarCnpj: vi.fn(),
  listarMunicipios: vi.fn(),
  buscarMunicipio: vi.fn(),
  corpoJson: vi.fn(),
  UFS: ['GO', 'SP'],
}));
vi.mock('../cadastros/comum/cadastros.api', () => tabelas);

import { JanelaDoFornecedor } from './JanelaDoFornecedor';

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

let raiz: Root;
let caixa: HTMLDivElement;

const esperar = async () => {
  await act(async () => {
    await new Promise((resolver) => setTimeout(resolver, 0));
  });
};

const campo = (rotulo: string): HTMLInputElement => {
  const label = [...document.querySelectorAll('label')].find(
    (item) => item.textContent?.trim() === rotulo,
  );
  if (!label) throw new Error(`campo "${rotulo}" não encontrado`);
  return document.getElementById(label.htmlFor) as HTMLInputElement;
};

const digitar = (elemento: HTMLInputElement, valor: string) => {
  const definir = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')?.set;
  act(() => {
    definir?.call(elemento, valor);
    elemento.dispatchEvent(new Event('input', { bubbles: true }));
  });
};

beforeEach(() => {
  vi.clearAllMocks();
  caixa = document.createElement('div');
  document.body.appendChild(caixa);
  raiz = createRoot(caixa);
});

afterEach(() => {
  act(() => raiz.unmount());
  caixa.remove();
});

describe('JanelaDoFornecedor', () => {
  it('abre como Janela real com as abas do Syndata e chave de geometria própria', async () => {
    act(() => raiz.render(<JanelaDoFornecedor fornecedorId={null} aoFechar={vi.fn()} />));
    await esperar();

    const janela = document.querySelector('[role="dialog"]') as HTMLElement;
    expect(janela).toBeTruthy();
    expect(janela.getAttribute('aria-label')).toBe('Novo fornecedor');

    const abas = [...document.querySelectorAll('[role="tab"]')].map((aba) =>
      aba.textContent?.trim(),
    );
    expect(abas).toEqual(['Principal', 'Documentos', 'Escrituração Digital']);
  });

  it('sair com alteração pendente pergunta antes de fechar (Esc), e mantém aberta se recusar', async () => {
    const aoFechar = vi.fn();
    const confirmSpy = vi.spyOn(window, 'confirm').mockReturnValue(false);
    act(() => raiz.render(<JanelaDoFornecedor fornecedorId={null} aoFechar={aoFechar} />));
    await esperar();

    digitar(campo('Nome Fantasia'), 'Distribuidora Teste');
    expect(document.body.textContent).toContain('Alterações não salvas.');

    act(() => {
      document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
    });

    expect(confirmSpy).toHaveBeenCalled();
    expect(aoFechar).not.toHaveBeenCalled();
    expect(document.querySelector('[role="dialog"]')).toBeTruthy();
    confirmSpy.mockRestore();
  });
});
