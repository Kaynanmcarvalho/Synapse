import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { AbaDocumentos } from './AbaDocumentos';

/** Fase 5.4: a aba Documentos do fornecedor migrou para a fundação de
 *  DataGrid. Travam: carregando → dados, dinheiro à direita, erro sem HEX e o
 *  aviso de cadastro não salvo. */

vi.mock('../fornecedores.api', () => ({ documentosDoFornecedor: vi.fn() }));
const { documentosDoFornecedor } = await import('../fornecedores.api');

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

let raiz: Root;
let caixa: HTMLDivElement;

beforeEach(() => {
  caixa = document.createElement('div');
  document.body.appendChild(caixa);
  raiz = createRoot(caixa);
});

afterEach(() => {
  act(() => raiz.unmount());
  caixa.remove();
  vi.mocked(documentosDoFornecedor).mockReset();
});

describe('AbaDocumentos do fornecedor', () => {
  it('sem cadastro salvo, avisa e não busca nada', async () => {
    await act(async () => raiz.render(<AbaDocumentos fornecedorId={null} />));
    expect(caixa.textContent).toContain('Salve o cadastro');
    expect(documentosDoFornecedor).not.toHaveBeenCalled();
  });

  it('mostra pedidos e títulos com o dinheiro à direita', async () => {
    vi.mocked(documentosDoFornecedor).mockResolvedValue({
      titulosEmAberto: [
        {
          id: 't1',
          descricao: 'NF 900 · 1/1',
          vencimento: '2026-10-05',
          valorCentavos: 50_000,
          saldoCentavos: 20_000,
          situacao: 'Parcial',
        },
      ],
      titulosPagos: [],
      pedidosDeCompra: [
        {
          id: 'p1',
          numero: 'PC-7',
          situacao: 'APROVADO',
          totalCentavos: 99_900,
          criadoEm: '2026-09-20',
        },
      ],
    });
    await act(async () => raiz.render(<AbaDocumentos fornecedorId="f1" />));
    const tabelas = caixa.querySelectorAll('table');
    expect(tabelas).toHaveLength(2);
    const titulo = [...(tabelas[0]?.querySelectorAll('tbody td') ?? [])];
    expect(titulo.map((td) => td.textContent)).toEqual([
      'NF 900 · 1/1',
      '05/10/2026',
      'Parcial',
      'R$500,00',
      'R$200,00',
    ]);
    expect(titulo[3]?.className).toContain('text-right');
    expect(tabelas[1]?.textContent).toContain('Aprovado');
    expect(caixa.textContent).toContain('Nenhum título pago ainda.');
    expect(caixa.innerHTML).not.toMatch(/#[0-9a-f]{6}/i);
  });

  it('falha na busca aparece em tom de perigo, sem HEX', async () => {
    vi.mocked(documentosDoFornecedor).mockRejectedValue(new Error('Sem conexão'));
    await act(async () => raiz.render(<AbaDocumentos fornecedorId="f1" />));
    const erro = [...caixa.querySelectorAll('p')].find((p) => p.textContent === 'Sem conexão');
    expect(erro?.className).toContain('text-status-perigo');
  });
});
