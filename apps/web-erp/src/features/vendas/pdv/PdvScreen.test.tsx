import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

/** O PDV na tela, com a API trocada por dublês: abre o caixa, lê o código de
 *  barras, muda a quantidade no F2, recebe em dinheiro com troco e cancela a
 *  venda pelo Ctrl+D com motivo. */

const api = vi.hoisted(() => ({
  listarFiliais: vi.fn(),
  buscarProdutos: vi.fn(),
  produtoPorCodigo: vi.fn(),
  produtoPorId: vi.fn(),
  resolverPreco: vi.fn(),
  listarFormasDePagamento: vi.fn(),
  sugestoesDoCliente: vi.fn(),
  caixaAtual: vi.fn(),
  abrirCaixa: vi.fn(),
  movimentarCaixa: vi.fn(),
  fecharCaixa: vi.fn(),
  concluirVenda: vi.fn(),
  vendasDoCaixa: vi.fn(),
  impressaoDaVenda: vi.fn(),
  cancelarVenda: vi.fn(),
  abrirDanfe: vi.fn(),
}));
vi.mock('../comum/vendas.api', () => api);

const funcionarios = vi.hoisted(() => ({ listarVendedores: vi.fn() }));
vi.mock('../../funcionarios/funcionarios.api', () => funcionarios);

import { PdvScreen } from './PdvScreen';

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;
Element.prototype.scrollIntoView = () => undefined;

const CAIXA = {
  id: 'caixa-1',
  branchId: 'matriz',
  operatorId: 'u1',
  openedAt: '2026-09-14T11:00:00.000Z',
  closedAt: null,
  openingAmount: 10_000,
  expectedCash: 10_000,
  countedCash: null,
  difference: null,
  movements: [],
};

const PRODUTO = {
  id: 'agua',
  sku: 'AGUA-500',
  name: 'AGUA MINERAL 500ML',
  categoryId: 'bebidas',
  brand: null,
  status: 'active',
  logistics: { unit: 'UN', weightKg: 0.5 },
  pricing: { salePrice: 2.5 },
};

let raiz: Root;
let caixa: HTMLDivElement;

const esperar = async (ms = 0) => {
  await act(async () => {
    await new Promise((resolver) => setTimeout(resolver, ms));
  });
};

const campo = (rotulo: string): HTMLInputElement => {
  const label = [...document.querySelectorAll('label')].find((item) =>
    item.textContent?.trim().startsWith(rotulo),
  );
  if (!label) throw new Error(`campo "${rotulo}" não encontrado`);
  return document.getElementById(label.htmlFor) as HTMLInputElement;
};

const digitar = (elemento: HTMLInputElement, valor: string) => {
  act(() => {
    Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')?.set?.call(
      elemento,
      valor,
    );
    elemento.dispatchEvent(new Event('input', { bubbles: true }));
  });
};

const enviar = async (formulario: HTMLFormElement | null | undefined) => {
  act(() => {
    formulario?.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
  });
  await esperar();
};

const tecla = async (key: string, extra: KeyboardEventInit = {}) => {
  act(() => {
    window.dispatchEvent(new KeyboardEvent('keydown', { key, bubbles: true, ...extra }));
  });
  await esperar();
};

const botao = (texto: string): HTMLButtonElement => {
  const achado = [...document.querySelectorAll('button')].find(
    (item) => item.textContent?.trim() === texto,
  );
  if (!achado) throw new Error(`botão "${texto}" não encontrado`);
  return achado;
};

beforeEach(() => {
  vi.clearAllMocks();
  window.localStorage.clear();
  api.listarFiliais.mockResolvedValue([{ id: 'matriz', name: 'Matriz', isHeadquarters: true }]);
  api.caixaAtual.mockResolvedValue(null);
  api.abrirCaixa.mockResolvedValue(CAIXA);
  api.produtoPorCodigo.mockResolvedValue(PRODUTO);
  api.resolverPreco.mockResolvedValue(250);
  api.listarFormasDePagamento.mockResolvedValue([
    { tipo: 'formas-de-pagamento', codigo: 1, nome: 'DINHEIRO', meio: 'DINHEIRO', ativo: true },
    { tipo: 'formas-de-pagamento', codigo: 2, nome: 'PIX', meio: 'PIX', ativo: true },
  ]);
  funcionarios.listarVendedores.mockResolvedValue([]);
  caixa = document.createElement('div');
  document.body.appendChild(caixa);
  raiz = createRoot(caixa);
});

afterEach(() => {
  act(() => raiz.unmount());
  caixa.remove();
});

describe('PdvScreen', () => {
  it('abre o caixa, vende com troco e cancela pelo Ctrl+D', async () => {
    const venda = {
      id: 'venda-1',
      numero: 7,
      cashSessionId: 'caixa-1',
      nfceDocumentId: null,
      total: 1_000,
      trocoCentavos: 1_000,
      payments: [{ method: 'CASH', amount: 1_000, formaCodigo: 1, formaNome: 'DINHEIRO' }],
      items: [],
      situacao: 'CONCLUIDA',
      completedAt: '2026-09-14T12:00:00.000Z',
      clienteNome: 'CONSUMIDOR FINAL',
    };
    api.concluirVenda.mockResolvedValue(venda);
    api.caixaAtual
      .mockResolvedValueOnce(null)
      .mockResolvedValue({ ...CAIXA, expectedCash: 11_000 });
    api.vendasDoCaixa.mockResolvedValue([venda]);
    api.cancelarVenda.mockResolvedValue({ ...venda, situacao: 'CANCELADA' });

    act(() =>
      raiz.render(
        <MemoryRouter initialEntries={['/inicio', '/vendas/pdv-balcao']} initialIndex={1}>
          <Routes>
            <Route path="/inicio" element={<p>Tela inicial</p>} />
            <Route path="/vendas/pdv-balcao" element={<PdvScreen modo="BALCAO" emJanela />} />
          </Routes>
        </MemoryRouter>,
      ),
    );
    await esperar();
    expect(document.querySelector('[role="dialog"]')?.getAttribute('aria-label')).toBe(
      'Venda PDV Balcão',
    );
    expect(document.body.textContent).toContain('Abrir caixa');
    const fundo = campo('Fundo de troco');
    digitar(fundo, '100,00');
    await enviar(fundo.closest('form'));
    expect(api.abrirCaixa).toHaveBeenCalledWith('matriz', 10_000);
    expect(document.body.textContent).toContain('CONSUMIDOR FINAL');

    const produto = campo('Produto / Serviço');
    digitar(produto, '7891000100103');
    act(() => {
      produto.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }));
    });
    await esperar();

    await tecla('F2');
    const quantidade = campo('(F2) Quantidade');
    expect(document.activeElement).toBe(quantidade);
    digitar(quantidade, '3');
    digitar(produto, '7891000100103');
    act(() => {
      produto.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }));
    });
    await esperar();

    const grade = document.querySelector('table')?.textContent ?? '';
    expect(grade).toContain('AGUA MINERAL 500ML');
    expect(grade).toMatch(/R\$\s7,50/);
    expect(document.body.textContent).toMatch(/Total Líquido\s*R\$\s10,00/);

    await tecla('F3');
    expect(document.body.textContent).toContain('Finalizar Venda');
    const valor = document.querySelector<HTMLInputElement>(
      'input[aria-label="Valor do pagamento"]',
    );
    if (!valor) throw new Error('sem campo de valor');
    digitar(valor, '20,00');
    await enviar(valor.closest('form'));
    expect(document.body.textContent).toMatch(/Troco\s*R\$\s10,00/);
    await tecla('F3');

    expect(api.concluirVenda).toHaveBeenCalledWith('caixa-1', {
      modo: 'BALCAO',
      customerId: null,
      customerTaxId: null,
      clienteNome: 'CONSUMIDOR FINAL',
      funcionarioId: null,
      mesaOuCartao: null,
      items: [
        { productId: 'agua', quantity: 1_000, discount: 0, surcharge: 0, lote: null, serie: null },
        { productId: 'agua', quantity: 3_000, discount: 0, surcharge: 0, lote: null, serie: null },
      ],
      payments: [{ formaCodigo: 1, amount: 2_000 }],
    });
    expect(document.body.textContent).toContain('Venda nº 7');

    act(() => botao('(Esc) Nova venda').click());
    await esperar(400);
    await tecla('d', { ctrlKey: true });
    expect(document.body.textContent).toContain('Cancelar Venda');
    act(() => botao('Cancelar').click());
    await esperar();
    const motivo = campo('Motivo do cancelamento');
    digitar(motivo, 'Cliente desistiu da compra');
    act(() => {
      motivo.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }));
    });
    await esperar();
    expect(api.cancelarVenda).toHaveBeenCalledWith('venda-1', 'Cliente desistiu da compra');

    // Sair da janela volta para onde estava, e a venda em andamento fica guardada.
    await esperar(400);
    act(() => botao('(Esc) Sair').click());
    await esperar(400);
    expect(document.body.textContent).toContain('Tela inicial');
    expect(document.querySelector('[role="dialog"]')).toBeNull();
  });
});
