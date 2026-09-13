import type { Customer } from '@synapse/types';
import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

/** A janela do cadastro de ponta a ponta na tela, com a API trocada por dublês:
 *  abas, validação antes de mandar, corpo enviado, atalhos e o que abre fora. */

const api = vi.hoisted(() => ({
  buscarCliente: vi.fn(),
  criarCliente: vi.fn(),
  atualizarCliente: vi.fn(),
  sugestoesDoCadastro: vi.fn(),
  listarClientes: vi.fn(),
}));
vi.mock('./clientes.api', () => api);

const credito = vi.hoisted(() => ({ apiRequest: vi.fn() }));
vi.mock('../../lib/dev-auth', () => credito);

import { JanelaDoCliente } from './JanelaDoCliente';

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

let raiz: Root;
let caixa: HTMLDivElement;

const esperar = async () => {
  await act(async () => {
    await new Promise((resolver) => setTimeout(resolver, 0));
  });
};

beforeEach(() => {
  vi.clearAllMocks();
  api.sugestoesDoCadastro.mockResolvedValue({
    grupos: ['ATACADO'],
    subGrupos: [],
    pracas: [],
    segmentos: [],
    ramosDeAtividade: [],
  });
  // Vendedores e painel de crédito: sem permissão, como um usuário só de cadastro.
  credito.apiRequest.mockRejectedValue(new Error('Permissão necessária: vendedor.gerenciar'));
  caixa = document.createElement('div');
  document.body.appendChild(caixa);
  raiz = createRoot(caixa);
});

afterEach(() => {
  act(() => raiz.unmount());
  caixa.remove();
});

const campo = (rotulo: string): HTMLInputElement | HTMLSelectElement => {
  const label = [...document.querySelectorAll('label')].find(
    (item) => item.textContent?.trim() === rotulo,
  );
  if (!label) throw new Error(`campo "${rotulo}" não encontrado`);
  const controle = document.getElementById(label.htmlFor);
  if (!controle) throw new Error(`controle de "${rotulo}" não encontrado`);
  return controle as HTMLInputElement;
};

const digitar = (rotulo: string, valor: string) => {
  const controle = campo(rotulo);
  const prototipo =
    controle instanceof HTMLSelectElement
      ? HTMLSelectElement.prototype
      : HTMLInputElement.prototype;
  const definir = Object.getOwnPropertyDescriptor(prototipo, 'value')?.set;
  act(() => {
    definir?.call(controle, valor);
    controle.dispatchEvent(
      new Event(controle instanceof HTMLSelectElement ? 'change' : 'input', { bubbles: true }),
    );
  });
};

const botao = (texto: string | RegExp) => {
  const achado = [...document.querySelectorAll('button')].find((item) =>
    typeof texto === 'string'
      ? item.textContent?.trim() === texto
      : texto.test(item.textContent ?? ''),
  );
  if (!achado) throw new Error(`botão "${String(texto)}" não encontrado`);
  return achado;
};

const clicar = (texto: string | RegExp) => act(() => botao(texto).click());

const preencherMinimo = () => {
  digitar('CNPJ', '11222333000181');
  digitar('Razão social', 'Mercado do Bairro LTDA');
  digitar('Nome fantasia', 'Mercado do Bairro');
  digitar('CEP', '74230020');
  digitar('Logradouro', 'Rua T-37');
  digitar('Número', '1450');
  digitar('Bairro', 'Setor Bueno');
  digitar('Cidade', 'Goiânia');
  digitar('UF', 'go');
  digitar('Telefone 1', '6232415566');
  digitar('Limite a prazo (R$)', '15.000,00');
};

const gravado = (extra: Partial<Customer> = {}): Customer =>
  ({
    id: 'cliente-1',
    tenantId: 'tenant-1',
    codigo: 'C-0042',
    type: 'PJ',
    taxId: '11222333000181',
    name: 'Mercado do Bairro',
    legalName: 'Mercado do Bairro LTDA',
    stateRegistration: null,
    municipalRegistration: null,
    address: {
      street: 'Rua T-37',
      number: '1450',
      complement: null,
      district: 'Setor Bueno',
      city: 'Goiânia',
      state: 'GO',
      postalCode: '74230020',
    },
    phone: '6232415566',
    whatsapp: null,
    email: null,
    telefones: { principal: '6232415566', secundario: null, celular: null, whatsapp: null },
    creditLimit: 1_500_000,
    openCredit: 0,
    financialStatus: 'REGULAR',
    active: true,
    responsibleSellerId: null,
    priceTableId: null,
    paymentTermId: null,
    createdAt: '2026-09-01T10:00:00.000Z',
    createdBy: { uid: 'u1', email: '', name: 'Ana', source: 'api' },
    updatedAt: '2026-09-10T10:00:00.000Z',
    updatedBy: { uid: 'u2', email: '', name: 'Beto', source: 'api' },
    version: 3,
    ...extra,
  }) as unknown as Customer;

describe('JanelaDoCliente — cadastro novo', () => {
  it('abre na aba Principal, com as sete abas do Syndata', async () => {
    act(() => raiz.render(<JanelaDoCliente clienteId={null} aoFechar={() => undefined} />));
    await esperar();
    const abas = [...document.querySelectorAll('[role="tab"]')].map((aba) =>
      aba.textContent?.trim(),
    );
    expect(abas).toEqual([
      'Principal',
      'Pessoa Jurídica',
      'Ref. Comerciais',
      'Controle de Vendas',
      'Outras Informações',
      'Documentos',
      'Relatórios',
    ]);
    expect(document.body.textContent).toContain('Novo cliente');
    expect(campo('Código').value).toBe('Novo cadastro');
  });

  it('salvar vazio não chama a API: aponta os campos e marca a aba', async () => {
    act(() => raiz.render(<JanelaDoCliente clienteId={null} aoFechar={() => undefined} />));
    await esperar();
    await act(async () => botao('(F2) Salvar').click());
    expect(api.criarCliente).not.toHaveBeenCalled();
    expect(document.body.textContent).toContain('Confira os campos destacados.');
    expect(document.body.textContent).toContain('Informe o CPF ou o CNPJ');
    expect(campo('CNPJ').getAttribute('aria-invalid')).toBe('true');
    // O ponto vermelho aparece na aba Principal, onde estao os campos com erro.
    expect(
      document.querySelector('[aria-label="Há campo para corrigir nesta aba"]'),
    ).not.toBeNull();
  });

  it('corrigido o último campo apontado, o rodapé e a aba param de pedir conferência', async () => {
    act(() => raiz.render(<JanelaDoCliente clienteId={null} aoFechar={() => undefined} />));
    await esperar();
    await act(async () => botao('(F2) Salvar').click());
    expect(document.body.textContent).toContain('Confira os campos destacados.');

    preencherMinimo();
    expect(document.body.textContent).not.toContain('Confira os campos destacados.');
    expect(document.body.textContent).toContain('Alterações não salvas.');
    expect(document.querySelector('[aria-label="Há campo para corrigir nesta aba"]')).toBeNull();
  });

  it('com os dados, salva o corpo que a API valida e avisa quem abriu', async () => {
    const aoSalvar = vi.fn();
    api.criarCliente.mockImplementation(async (corpo: Record<string, unknown>) =>
      gravado({ name: corpo['name'] as string }),
    );
    act(() =>
      raiz.render(
        <JanelaDoCliente clienteId={null} aoFechar={() => undefined} aoSalvar={aoSalvar} />,
      ),
    );
    await esperar();
    preencherMinimo();
    await act(async () => botao('(F2) Salvar').click());
    await esperar();

    expect(api.criarCliente).toHaveBeenCalledTimes(1);
    expect(api.criarCliente.mock.calls[0]?.[0]).toMatchObject({
      type: 'PJ',
      taxId: '11222333000181',
      name: 'Mercado do Bairro',
      creditLimit: 1_500_000,
      address: { state: 'GO', postalCode: '74230020' },
      telefones: { principal: '6232415566' },
    });
    expect(aoSalvar).toHaveBeenCalledWith(expect.objectContaining({ codigo: 'C-0042' }));
    expect(document.body.textContent).toContain('C-0042 · Mercado do Bairro');
  });

  it('F2 salva pelo teclado, como no sistema antigo', async () => {
    api.criarCliente.mockResolvedValue(gravado());
    act(() => raiz.render(<JanelaDoCliente clienteId={null} aoFechar={() => undefined} />));
    await esperar();
    preencherMinimo();
    await act(async () => {
      window.dispatchEvent(new KeyboardEvent('keydown', { key: 'F2', bubbles: true }));
    });
    await esperar();
    expect(api.criarCliente).toHaveBeenCalledTimes(1);
  });

  it('erro da API aparece no rodapé, sem perder o que foi digitado', async () => {
    api.criarCliente.mockRejectedValue(
      new Error('Já existe cliente com este CPF/CNPJ: C-0007 · Outro'),
    );
    act(() => raiz.render(<JanelaDoCliente clienteId={null} aoFechar={() => undefined} />));
    await esperar();
    preencherMinimo();
    await act(async () => botao('(F2) Salvar').click());
    await esperar();
    expect(document.body.textContent).toContain('Já existe cliente com este CPF/CNPJ');
    expect(campo('Razão social').value).toBe('Mercado do Bairro LTDA');
  });

  it('pessoa física: a aba de pessoa jurídica explica em vez de mostrar campos', async () => {
    act(() => raiz.render(<JanelaDoCliente clienteId={null} aoFechar={() => undefined} />));
    await esperar();
    digitar('Tipo de pessoa', 'PF');
    clicar('Pessoa Jurídica');
    expect(document.body.textContent).toContain('Esta aba vale para cliente pessoa jurídica');
    expect(document.querySelector('input[type="checkbox"]')).toBeNull();
  });
});

describe('JanelaDoCliente — cliente gravado', () => {
  it('abre com o código, e F3 desfaz o que foi digitado', async () => {
    api.buscarCliente.mockResolvedValue(gravado());
    act(() => raiz.render(<JanelaDoCliente clienteId="cliente-1" aoFechar={() => undefined} />));
    await esperar();
    expect(campo('Código').value).toBe('C-0042');
    expect(campo('Nome fantasia').value).toBe('Mercado do Bairro');

    digitar('Nome fantasia', 'Outro nome');
    expect(document.body.textContent).toContain('Alterações não salvas.');
    await act(async () => {
      window.dispatchEvent(new KeyboardEvent('keydown', { key: 'F3', bubbles: true }));
    });
    expect(campo('Nome fantasia').value).toBe('Mercado do Bairro');
  });

  it('salvar edição chama atualizar, e não criar', async () => {
    api.buscarCliente.mockResolvedValue(gravado());
    api.atualizarCliente.mockResolvedValue(gravado({ name: 'Mercado Novo' }));
    act(() => raiz.render(<JanelaDoCliente clienteId="cliente-1" aoFechar={() => undefined} />));
    await esperar();
    digitar('Nome fantasia', 'Mercado Novo');
    await act(async () => botao('(F2) Salvar').click());
    await esperar();
    expect(api.criarCliente).not.toHaveBeenCalled();
    expect(api.atualizarCliente).toHaveBeenCalledWith(
      'cliente-1',
      expect.objectContaining({ name: 'Mercado Novo' }),
    );
  });

  it('Outras Informações mostra quem cadastrou e quem alterou', async () => {
    api.buscarCliente.mockResolvedValue(gravado());
    act(() => raiz.render(<JanelaDoCliente clienteId="cliente-1" aoFechar={() => undefined} />));
    await esperar();
    clicar('Outras Informações');
    expect(document.body.textContent).toContain('01/09/2026 · Ana');
    expect(document.body.textContent).toContain('10/09/2026 · Beto');
  });

  it('sem permissão do financeiro, Documentos diz isso em vez de ficar vazio', async () => {
    api.buscarCliente.mockResolvedValue(gravado());
    act(() => raiz.render(<JanelaDoCliente clienteId="cliente-1" aoFechar={() => undefined} />));
    await esperar();
    clicar('Documentos');
    expect(document.body.textContent).toContain('exigem permissão do financeiro');
  });

  it('Relatórios abre a análise de crédito do cliente e lista o que não existe', async () => {
    const aoAbrirCredito = vi.fn();
    api.buscarCliente.mockResolvedValue(gravado());
    act(() =>
      raiz.render(
        <JanelaDoCliente
          clienteId="cliente-1"
          aoFechar={() => undefined}
          aoAbrirCredito={aoAbrirCredito}
        />,
      ),
    );
    await esperar();
    clicar('Relatórios');
    clicar(/Análise de crédito do cliente/);
    expect(aoAbrirCredito).toHaveBeenCalledWith('cliente-1');
    expect(document.body.textContent).toContain('Curva ABC por cliente');
    expect(document.body.textContent).toContain('Ainda não existem no Synapse');
  });

  it('inadimplente: avisa que salvar o cadastro não tira a inadimplência', async () => {
    api.buscarCliente.mockResolvedValue(gravado({ financialStatus: 'OVERDUE' }));
    act(() => raiz.render(<JanelaDoCliente clienteId="cliente-1" aoFechar={() => undefined} />));
    await esperar();
    expect(document.body.textContent).toContain('Salvar o cadastro não muda isso');
  });
});
