import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

/** O Ponto de Vendas na tela, com a API trocada por dublês: lança pelo código,
 *  o preço digitado vira desconto, F3 fecha o documento e F2 manda o pedido. */

const api = vi.hoisted(() => ({
  listarFiliais: vi.fn(),
  buscarProdutos: vi.fn(),
  produtoPorCodigo: vi.fn(),
  produtoPorId: vi.fn(),
  resolverPreco: vi.fn(),
  listarFormasDePagamento: vi.fn(),
  registrarPedidoDeBalcao: vi.fn(),
  historicoDoBalcao: vi.fn(),
  impressaoDoPedidoDeBalcao: vi.fn(),
  sugestoesDoCliente: vi.fn(),
}));
vi.mock('../comum/vendas.api', () => api);

const funcionarios = vi.hoisted(() => ({ listarVendedores: vi.fn() }));
vi.mock('../../funcionarios/funcionarios.api', () => funcionarios);

import { VendaBalcaoScreen } from './VendaBalcaoScreen';

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;
// O jsdom não rola a tela; a grade pede para mostrar a linha escolhida.
Element.prototype.scrollIntoView = () => undefined;

const RACAO = {
  id: 'start-25',
  sku: 'START-25',
  name: 'RACAO START 25KG',
  categoryId: 'racoes',
  brand: null,
  status: 'active',
  logistics: { unit: 'SC', weightKg: 25 },
  pricing: { salePrice: 98.96 },
};

const CLIENTE = {
  id: 'c-1503',
  codigo: '1503',
  nome: 'MUNDO DOS PETS',
  razaoSocial: 'THIAGO PEREIRA GOMES',
  documento: '34281018000120',
  cidade: 'APARECIDA DE GOIANIA',
  uf: 'GO',
  situacao: 'REGULAR',
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

const digitar = (elemento: HTMLInputElement | HTMLSelectElement, valor: string) => {
  const prototipo =
    elemento instanceof HTMLSelectElement
      ? HTMLSelectElement.prototype
      : HTMLInputElement.prototype;
  act(() => {
    Object.getOwnPropertyDescriptor(prototipo, 'value')?.set?.call(elemento, valor);
    elemento.dispatchEvent(
      new Event(elemento instanceof HTMLSelectElement ? 'change' : 'input', { bubbles: true }),
    );
  });
};

const enter = async (elemento: HTMLElement) => {
  act(() => {
    elemento.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }));
  });
  await esperar();
};

const tecla = async (key: string) => {
  act(() => {
    window.dispatchEvent(new KeyboardEvent('keydown', { key, bubbles: true }));
  });
  await esperar();
};

beforeEach(() => {
  vi.clearAllMocks();
  window.localStorage.clear();
  window.localStorage.setItem('synapse:balcao:cliente', JSON.stringify(CLIENTE));
  api.listarFiliais.mockResolvedValue([{ id: 'matriz', name: 'Matriz', isHeadquarters: true }]);
  api.produtoPorCodigo.mockResolvedValue(RACAO);
  api.resolverPreco.mockResolvedValue(9_896);
  api.listarFormasDePagamento.mockResolvedValue([
    { tipo: 'formas-de-pagamento', codigo: 1, nome: 'DINHEIRO', meio: 'DINHEIRO', ativo: true },
  ]);
  api.impressaoDoPedidoDeBalcao.mockReturnValue(new Promise(() => undefined));
  funcionarios.listarVendedores.mockResolvedValue([
    {
      id: 'func-44',
      codigo: 44,
      nome: 'TULIO VARGAS',
      bloqueado: false,
      demitido: false,
      descontoMaximoPercentual: 10,
    },
  ]);
  caixa = document.createElement('div');
  document.body.appendChild(caixa);
  raiz = createRoot(caixa);
});

afterEach(() => {
  act(() => raiz.unmount());
  caixa.remove();
});

describe('VendaBalcaoScreen', () => {
  it('lança pelo código, negocia o preço e fecha o documento com F3 e F2', async () => {
    api.registrarPedidoDeBalcao.mockImplementation(async (corpo: Record<string, unknown>) => ({
      ...corpo,
      id: 'pedido-1',
      numero: 2019,
      clienteNome: 'MUNDO DOS PETS',
    }));
    act(() =>
      raiz.render(
        <MemoryRouter>
          <VendaBalcaoScreen />
        </MemoryRouter>,
      ),
    );
    await esperar();
    expect(document.body.textContent).toContain('Ponto de Vendas');
    expect(document.body.textContent).toContain('1503 - MUNDO DOS PETS');

    digitar(campo('Vendedor') as unknown as HTMLSelectElement, 'func-44');

    const produto = campo('Produto / Serviço');
    digitar(produto, 'START-25');
    await enter(produto);
    expect(api.produtoPorCodigo).toHaveBeenCalledWith('START-25');
    expect(api.resolverPreco).toHaveBeenCalledWith(
      expect.objectContaining({ productId: 'start-25', branchId: 'matriz', customerId: 'c-1503' }),
    );

    const quantidade = campo('(F2) Quantidade');
    digitar(quantidade, '2');
    await enter(quantidade);
    const valor = campo('Valor Unitário');
    expect(valor.value).toBe('98,96');
    digitar(valor, '90,00');
    await enter(valor);

    const grade = document.querySelector('table')?.textContent ?? '';
    expect(grade).toContain('RACAO START 25KG');
    expect(grade).toMatch(/197,92/);
    expect(grade).toMatch(/17,92/);

    await tecla('F3');
    expect(document.body.textContent).toContain('Fechar Documento');
    await tecla('F2');

    expect(api.registrarPedidoDeBalcao).toHaveBeenCalledWith({
      branchId: 'matriz',
      customerId: 'c-1503',
      funcionarioId: 'func-44',
      tipo: 'VENDA',
      formaDePagamentoCodigo: 1,
      condicaoDePagamento: '',
      freteCentavos: 0,
      acrescimoCentavos: 0,
      observacao: null,
      itens: [
        {
          productId: 'start-25',
          quantidade: 2_000,
          precoNegociadoCentavos: null,
          descontoCentavos: 1_792,
          lote: null,
        },
      ],
    });
    expect(api.impressaoDoPedidoDeBalcao).toHaveBeenCalledWith('pedido-1');
    expect(document.body.textContent).toContain('Pedido nº 2019 registrado');
    expect(window.localStorage.getItem('synapse:balcao:itens')).toBeNull();
  });

  it('não fecha sem vendedor e avisa na tela', async () => {
    act(() =>
      raiz.render(
        <MemoryRouter>
          <VendaBalcaoScreen />
        </MemoryRouter>,
      ),
    );
    await esperar();
    const produto = campo('Produto / Serviço');
    digitar(produto, 'START-25');
    await enter(produto);
    await enter(campo('(F2) Quantidade'));
    await enter(campo('Valor Unitário'));
    await tecla('F3');
    expect(document.body.textContent).toContain('Escolha o vendedor');
    expect(document.querySelector('[role="dialog"]')).toBeNull();
  });
});
