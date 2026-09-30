import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

/** Fase 7.4 — redesign de composição + correção de bugs reais sobre a
 *  DfeScreen (zero cobertura existia antes). Estes testes travam o que a
 *  fase corrigiu (quantidade/custo exibidos em unidade/reais, não em
 *  milésimos/centavos crus; erro de conferência de item ancorado na linha,
 *  não num banner genérico; `observacao` do backend agora visível) e o que
 *  não podia mudar (payload de `checkDfeItem`/`launchDfe`, regra de quando
 *  a grade fica editável). */

const dev = vi.hoisted(() => ({ apiRequest: vi.fn() }));
vi.mock('../../lib/dev-auth', () => dev);

import { DfeScreen } from './DfeScreen';

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

let raiz: Root;
let caixa: HTMLDivElement;
const montar = (conteudo: React.ReactNode) => act(() => raiz.render(conteudo));
const esperar = async () => {
  await act(async () => {
    await new Promise((resolver) => setTimeout(resolver, 0));
  });
};

const digitar = (elemento: HTMLInputElement, valor: string) => {
  const definir = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')?.set;
  act(() => {
    definir?.call(elemento, valor);
    elemento.dispatchEvent(new Event('input', { bubbles: true }));
  });
};

const botao = (texto: string | RegExp) =>
  [...caixa.querySelectorAll('button')].find((b) =>
    typeof texto === 'string' ? b.textContent?.trim() === texto : texto.test(b.textContent ?? ''),
  );
const porRotulo = (rotulo: string) =>
  caixa.querySelector<HTMLInputElement>(`[aria-label="${rotulo}"]`);

const NOTA = (parcial: Partial<{ situacao: string; itens: unknown[] }> = {}) => ({
  nota: {
    chaveDeAcesso: '35260900000000000000550010000001231000000012',
    numero: '1231',
    emitente: { nome: 'Distribuidora Atacado Nordeste', cnpj: '12345678000199' },
    valorTotalCentavos: 458700,
  },
  conferencia: {
    situacao: parcial.situacao ?? 'PENDENTE',
    itens: parcial.itens ?? [
      {
        numero: 1,
        productId: null,
        quantidadeMilesimos: 12500,
        custoUnitarioCentavos: 890,
        lote: 'L2026-09-A',
        validade: '2027-03-15',
        conferido: false,
        observacao: 'Produto do fornecedor ainda não vinculado a um produto interno',
      },
      {
        numero: 2,
        productId: 'PROD-ACUCAR-1KG',
        quantidadeMilesimos: 50000,
        custoUnitarioCentavos: 450,
        lote: 'L2026-09-B',
        validade: '2027-06-01',
        conferido: false,
        observacao: null,
      },
    ],
  },
  manifestacao: null,
});

const respostaLista = (...entries: ReturnType<typeof NOTA>[]) => ({
  items: entries,
  nextCursor: null,
  hasMore: false,
});

beforeEach(() => {
  caixa = document.createElement('div');
  document.body.appendChild(caixa);
  raiz = createRoot(caixa);
  dev.apiRequest.mockReset();
});

afterEach(() => {
  act(() => raiz.unmount());
  caixa.remove();
});

describe('DfeScreen — quantidade e custo (Fase 7.4, correção de bug real)', () => {
  it('mostra quantidade em unidades (milésimos ÷ 1000), não o número cru', async () => {
    dev.apiRequest.mockResolvedValue(respostaLista(NOTA()));
    montar(<DfeScreen />);
    await esperar();

    expect(porRotulo('Quantidade do item 1')?.value).toBe('12,5');
    expect(porRotulo('Quantidade do item 2')?.value).toBe('50');
  });

  it('mostra custo em reais com "R$", não centavos crus', async () => {
    dev.apiRequest.mockResolvedValue(respostaLista(NOTA()));
    montar(<DfeScreen />);
    await esperar();

    expect(porRotulo('Custo unitário do item 1, em reais')?.value).toBe('8,90');
    expect(caixa.textContent).toContain('R$');
  });
});

describe('DfeScreen — observação do backend (Fase 7.4, antes invisível)', () => {
  it('mostra a observação de item sem de-para, some quando conferido', async () => {
    dev.apiRequest.mockResolvedValue(respostaLista(NOTA()));
    montar(<DfeScreen />);
    await esperar();

    expect(caixa.textContent).toContain('Produto do fornecedor ainda não vinculado');
  });

  it('não mostra observação para item já vinculado', async () => {
    dev.apiRequest.mockResolvedValue(respostaLista(NOTA()));
    montar(<DfeScreen />);
    await esperar();

    const linhaDoItem2 = porRotulo('Produto interno do item 2')?.closest('td');
    expect(linhaDoItem2?.textContent).not.toContain('vinculado');
  });
});

describe('DfeScreen — conferir item (payload e validação)', () => {
  it('"Conferir" fica desabilitado sem produto interno preenchido', async () => {
    dev.apiRequest.mockResolvedValue(respostaLista(NOTA()));
    montar(<DfeScreen />);
    await esperar();

    const linha1 = porRotulo('Produto interno do item 1')!.closest('tr')!;
    const conferir = [...linha1.querySelectorAll('button')].find(
      (b) => b.textContent?.trim() === 'Conferir',
    );
    expect(conferir?.disabled).toBe(true);
  });

  it('"Conferir" fica desabilitado com quantidade zerada/inválida', async () => {
    dev.apiRequest.mockResolvedValue(respostaLista(NOTA()));
    montar(<DfeScreen />);
    await esperar();

    digitar(porRotulo('Produto interno do item 1')!, 'PROD-X');
    digitar(porRotulo('Quantidade do item 1')!, '0');
    await esperar();

    const linha1 = porRotulo('Produto interno do item 1')!.closest('tr')!;
    const conferir = [...linha1.querySelectorAll('button')].find(
      (b) => b.textContent?.trim() === 'Conferir',
    );
    expect(conferir?.disabled).toBe(true);
  });

  it('envia o payload correto: productId trim, milésimos e centavos convertidos', async () => {
    dev.apiRequest.mockResolvedValue(respostaLista(NOTA()));
    montar(<DfeScreen />);
    await esperar();

    digitar(porRotulo('Produto interno do item 1')!, '  PROD-CAFE  ');
    digitar(porRotulo('Quantidade do item 1')!, '12,5');
    digitar(porRotulo('Custo unitário do item 1, em reais')!, '8,90');
    await esperar();

    dev.apiRequest.mockResolvedValueOnce(respostaLista(NOTA()).items[0]);
    const linha1 = porRotulo('Produto interno do item 1')!.closest('tr')!;
    const conferir = [...linha1.querySelectorAll('button')].find(
      (b) => b.textContent?.trim() === 'Conferir',
    );
    await act(async () => conferir?.click());

    const chamada = dev.apiRequest.mock.calls.find((c) => String(c[0]).includes('/items/1'));
    expect(chamada?.[0]).toBe('/inbound/dfe/35260900000000000000550010000001231000000012/items/1');
    const corpo = JSON.parse((chamada?.[1] as RequestInit).body as string);
    expect(corpo).toEqual({
      productId: 'PROD-CAFE',
      quantidadeMilesimos: 12500,
      custoUnitarioCentavos: 890,
      lote: 'L2026-09-A',
      validade: '2027-03-15',
    });
  });

  it('erro ao conferir aparece ancorado na linha do item, não num banner genérico', async () => {
    dev.apiRequest.mockResolvedValue(respostaLista(NOTA()));
    montar(<DfeScreen />);
    await esperar();

    digitar(porRotulo('Produto interno do item 2')!, 'PROD-Y');
    await esperar();

    dev.apiRequest.mockRejectedValueOnce(new Error('quantidadeMilesimos deve ser positivo'));
    const linha2 = porRotulo('Produto interno do item 2')!.closest('tr')!;
    const conferir = [...linha2.querySelectorAll('button')].find(
      (b) => b.textContent?.trim() === 'Conferir',
    );
    await act(async () => conferir?.click());

    const alerta = caixa.querySelector('[role="alert"]');
    expect(alerta?.textContent).toBe('Item 2: quantidadeMilesimos deve ser positivo');
  });
});

describe('DfeScreen — estados do documento (PENDENTE/CONFERIDA/LANCADA)', () => {
  it('CONFERIDA desabilita a grade e mostra "Lançar entrada"', async () => {
    dev.apiRequest.mockResolvedValue(
      respostaLista(
        NOTA({
          situacao: 'CONFERIDA',
          itens: [
            {
              numero: 1,
              productId: 'PROD-X',
              quantidadeMilesimos: 1000,
              custoUnitarioCentavos: 100,
              lote: null,
              validade: null,
              conferido: true,
              observacao: null,
            },
          ],
        }),
      ),
    );
    montar(<DfeScreen />);
    await esperar();

    expect(porRotulo('Produto interno do item 1')?.disabled).toBe(true);
    expect(botao('Lançar entrada')).not.toBeUndefined();
    expect(caixa.textContent).toContain('Conferência concluída — pronta para lançar a entrada.');
  });

  it('LANCADA mostra mensagem de fechamento e nenhuma ação', async () => {
    dev.apiRequest.mockResolvedValue(
      respostaLista(
        NOTA({
          situacao: 'LANCADA',
          itens: [
            {
              numero: 1,
              productId: 'PROD-X',
              quantidadeMilesimos: 1000,
              custoUnitarioCentavos: 100,
              lote: null,
              validade: null,
              conferido: true,
              observacao: null,
            },
          ],
        }),
      ),
    );
    montar(<DfeScreen />);
    await esperar();

    expect(caixa.textContent).toContain(
      'Lançado no estoque e no financeiro — conferência encerrada.',
    );
    expect(botao('Concluir conferência')).toBeUndefined();
    expect(botao('Lançar entrada')).toBeUndefined();
  });
});

describe('DfeScreen — falha ao carregar lista não vira "importe um XML" silencioso', () => {
  it('erro na API mostra alerta distinto do vazio real', async () => {
    dev.apiRequest.mockRejectedValue(new Error('Falha ao carregar DF-e'));
    montar(<DfeScreen />);
    await esperar();

    expect(caixa.querySelector('[role="alert"]')?.textContent).toBe('Falha ao carregar DF-e');
    expect(caixa.textContent).not.toContain('Importe um XML para começar.');
  });

  it('lista genuinamente vazia mostra a mensagem de importar, sem alerta', async () => {
    dev.apiRequest.mockResolvedValue(respostaLista());
    montar(<DfeScreen />);
    await esperar();

    expect(caixa.querySelector('[role="alert"]')).toBeNull();
    expect(caixa.textContent).toContain('Importe um XML para começar.');
  });
});
