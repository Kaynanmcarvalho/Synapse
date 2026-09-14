import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

/** A janela do funcionário na tela, com a API trocada por dublês: abas do
 *  Syndata, aviso antes de mandar e o corpo que chega na API pelo F2. */

const api = vi.hoisted(() => ({
  buscarFuncionario: vi.fn(),
  criarFuncionario: vi.fn(),
  atualizarFuncionario: vi.fn(),
  lerFoto: vi.fn(),
  enviarFoto: vi.fn(),
  removerFoto: vi.fn(),
  listarUsuarios: vi.fn(),
  definirUsuario: vi.fn(),
  pedidosDoFuncionario: vi.fn(),
  resumoDoFuncionario: vi.fn(),
  listarFuncionarios: vi.fn(),
  listarVendedores: vi.fn(),
}));
vi.mock('./funcionarios.api', () => api);

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

import { JanelaDoFuncionario } from './JanelaDoFuncionario';

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

describe('JanelaDoFuncionario', () => {
  it('mostra as abas do Syndata e salva pelo F2 com o corpo do schema', async () => {
    api.criarFuncionario.mockImplementation(async (corpo: Record<string, unknown>) => ({
      ...corpo,
      id: 'f1',
      codigo: 15,
      usuario: null,
      fotoAtualizadaEm: null,
      endereco: { cep: '', logradouro: '', bairro: '', cidadeCodigoIbge: null, cidade: '', uf: '' },
      cargo: { codigo: 1, nome: 'GERAL' },
      praca: { codigo: 1, nome: 'GERAL' },
      departamento: { codigo: 1, nome: 'GERAL' },
      outrasInformacoes: { sexo: 'NAO_INFORMADO', estadoCivil: 'NAO_INFORMADO' },
      documentos: {},
      comissao: {
        vendedor: true,
        percentualAVista: 2,
        percentualAPrazo: 0,
        base: 'FATURAMENTO',
        descontoMaximoPercentual: 0,
        metaMensalCentavos: 0,
      },
      salarioCentavos: 150_000,
      version: 1,
    }));
    const aoSalvar = vi.fn();
    act(() =>
      raiz.render(
        <JanelaDoFuncionario funcionarioId={null} aoFechar={vi.fn()} aoSalvar={aoSalvar} />,
      ),
    );
    await esperar();

    const abas = [...document.querySelectorAll('[role="tab"]')].map((aba) =>
      aba.textContent?.trim(),
    );
    expect(abas).toEqual([
      'Principal',
      'Outras Informações',
      'Comissão',
      'Documentos',
      'Relatórios',
    ]);

    // Sem nome, o F2 não chama a API e aponta o campo.
    act(() => {
      window.dispatchEvent(new KeyboardEvent('keydown', { key: 'F2' }));
    });
    await esperar();
    expect(api.criarFuncionario).not.toHaveBeenCalled();
    expect(document.body.textContent).toContain('Informe o nome');

    digitar(campo('Nome *'), 'renier pantoja');
    digitar(campo('Salário (R$)'), '1.500,00');
    act(() => {
      window.dispatchEvent(new KeyboardEvent('keydown', { key: 'F2' }));
    });
    await esperar();

    expect(api.criarFuncionario).toHaveBeenCalledWith(
      expect.objectContaining({ nome: 'RENIER PANTOJA', salarioCentavos: 150_000 }),
    );
    expect(aoSalvar).toHaveBeenCalled();
    expect(document.body.textContent).toContain('15 - RENIER PANTOJA');
  });
});
