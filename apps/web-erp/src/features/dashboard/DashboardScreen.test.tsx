import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

/** Fase 7.2 — redesign de composição sobre a DashboardScreen. Estes testes
 *  travam o que a fase PROÍBE mudar (query string enviada a
 *  `/analytics/dashboard`, os números que já vêm prontos da API) e o que ela
 *  corrigiu ou adicionou de verdade: a re-consulta não pode mais apagar a
 *  tela inteira sem indicar carregamento (bug real encontrado no baseline),
 *  os cartões variam por perfil sem inventar métrica nova, e o ranking de
 *  filiais é só a mesma coluna Faturamento reordenada. */

const dev = vi.hoisted(() => ({ apiRequest: vi.fn() }));
vi.mock('../../lib/dev-auth', () => dev);

import { DashboardScreen } from './DashboardScreen';

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

let raiz: Root;
let caixa: HTMLDivElement;
const montar = (conteudo: React.ReactNode) =>
  act(() => raiz.render(<MemoryRouter>{conteudo}</MemoryRouter>));
/** `formatarMoeda` usa `Intl.NumberFormat('pt-BR')`, que separa "R$" do
 *  valor com espaço fino insecável (U+00A0), não espaço comum. */
const dinheiro = (texto: string) => texto.replace(' ', ' ');
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

const RESPOSTA_ADMIN = {
  ready: true,
  calculatedAt: '2026-09-30T01:55:00.000Z',
  sales: {
    revenueCentavos: 48215000,
    sales: 312,
    averageTicketCentavos: 154535,
    commissionCentavos: 0,
    customers: 187,
  },
  monthlyGoalCentavos: null,
  branches: [
    {
      branchId: 'matriz',
      sales: 210,
      revenueCentavos: 32890000,
      averageTicketCentavos: 156619,
      commissionCentavos: 0,
      customers: 130,
      receivableCentavos: 1284500,
      payableCentavos: 895000,
      overdueCentavos: 128000,
    },
    {
      branchId: 'filial-2',
      sales: 28,
      revenueCentavos: 4125000,
      averageTicketCentavos: 147321,
      commissionCentavos: 0,
      customers: 15,
      receivableCentavos: 98000,
      payableCentavos: 0,
      overdueCentavos: 45000,
    },
  ],
  stock: [{ branchId: 'matriz', available: 4820, outOfStock: 6 }],
};

const RESPOSTA_SELLER = {
  ready: true,
  calculatedAt: '2026-09-30T01:55:00.000Z',
  sales: {
    revenueCentavos: 6890000,
    sales: 41,
    averageTicketCentavos: 168048,
    commissionCentavos: 344500,
    customers: 33,
  },
  monthlyGoalCentavos: 15000000,
  branches: [],
  stock: [],
};

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

describe('DashboardScreen — query enviada à API (contrato congelado)', () => {
  it('monta a query com from/to/profile no carregamento inicial', async () => {
    dev.apiRequest.mockResolvedValue(RESPOSTA_ADMIN);
    montar(<DashboardScreen />);
    await esperar();

    expect(dev.apiRequest).toHaveBeenCalledTimes(1);
    const rota = dev.apiRequest.mock.calls.at(0)![0] as string;
    expect(rota).toMatch(/^\/analytics\/dashboard\?/);
    const query = new URLSearchParams(rota.split('?')[1]);
    expect(query.get('profile')).toBe('admin');
    expect(query.get('from')).toBeTruthy();
    expect(query.get('to')).toBeTruthy();
    expect(query.has('branchId')).toBe(false);
    expect(query.has('sellerId')).toBe(false);
  });

  it('inclui branchId e sellerId só quando preenchidos', async () => {
    dev.apiRequest.mockResolvedValue(RESPOSTA_ADMIN);
    montar(<DashboardScreen />);
    await esperar();

    digitar(caixa.querySelector('input[placeholder="Todas as permitidas"]')!, 'matriz');
    digitar(caixa.querySelector('input[placeholder="Todos"]')!, 'vendedor-x');
    act(() => botao('Consultar')?.dispatchEvent(new MouseEvent('click', { bubbles: true })));
    await esperar();

    const rota = dev.apiRequest.mock.calls.at(-1)![0] as string;
    const query = new URLSearchParams(rota.split('?')[1]);
    expect(query.get('branchId')).toBe('matriz');
    expect(query.get('sellerId')).toBe('vendedor-x');
  });

  it('perfil "seller" nunca envia sellerId, mesmo que o campo exista', async () => {
    dev.apiRequest.mockResolvedValue(RESPOSTA_SELLER);
    montar(<DashboardScreen />);
    await esperar();

    const select = caixa.querySelector('select')!;
    act(() => {
      (select as HTMLSelectElement).value = 'seller';
      select.dispatchEvent(new Event('change', { bubbles: true }));
    });
    await esperar();
    act(() => botao('Consultar')?.dispatchEvent(new MouseEvent('click', { bubbles: true })));
    await esperar();

    const rota = dev.apiRequest.mock.calls.at(-1)![0] as string;
    expect(new URLSearchParams(rota.split('?')[1]).has('sellerId')).toBe(false);
    // campo "Vendedor" nem aparece para o perfil seller
    expect(caixa.querySelector('input[placeholder="Todos"]')).toBeNull();
  });
});

describe('DashboardScreen — estados ready/loading/error/vazio', () => {
  it('ready:false mostra a mensagem da API e nenhum indicador', async () => {
    dev.apiRequest.mockResolvedValue({
      ready: false,
      message: 'Indicadores aguardando o próximo cálculo automático (até 5 minutos).',
    });
    montar(<DashboardScreen />);
    await esperar();

    expect(caixa.querySelector('[role="status"]')?.textContent).toContain(
      'aguardando o próximo cálculo',
    );
    expect(caixa.querySelector('table')).toBeNull();
    expect(caixa.querySelector('dl')).toBeNull();
  });

  it('erro na API mostra alert visível e nenhum dado anterior sobrevive', async () => {
    dev.apiRequest.mockRejectedValue(new Error('Falha simulada'));
    montar(<DashboardScreen />);
    await esperar();

    expect(caixa.querySelector('[role="alert"]')?.textContent).toBe('Falha simulada');
    expect(caixa.querySelector('table')).toBeNull();
  });

  it('Fase 7.2 — re-consulta mostra "Carregando…" em vez de apagar a tela sem indicação', async () => {
    let resolverSegunda: (v: unknown) => void = () => {};
    dev.apiRequest.mockResolvedValueOnce(RESPOSTA_ADMIN).mockImplementationOnce(
      () =>
        new Promise((resolve) => {
          resolverSegunda = resolve;
        }),
    );
    montar(<DashboardScreen />);
    await esperar();
    expect(caixa.textContent).toContain(dinheiro('R$ 482.150,00'));

    act(() => botao('Consultar')?.dispatchEvent(new MouseEvent('click', { bubbles: true })));
    await esperar();

    // durante a segunda chamada (ainda pendente): sem flash em branco, com
    // indicação explícita de carregamento no corpo da tela.
    expect(caixa.querySelector('[role="status"]')?.textContent).toContain('Carregando');

    await act(async () => {
      resolverSegunda(RESPOSTA_ADMIN);
      await new Promise((r) => setTimeout(r, 0));
    });
  });

  it('vendas zeradas no período renderizam cartões com R$ 0,00, sem seções vazias de filiais/estoque', async () => {
    dev.apiRequest.mockResolvedValue({
      ready: true,
      calculatedAt: '2026-09-30T01:55:00.000Z',
      sales: {
        revenueCentavos: 0,
        sales: 0,
        averageTicketCentavos: 0,
        commissionCentavos: 0,
        customers: 0,
      },
      monthlyGoalCentavos: null,
      branches: [],
      stock: [],
    });
    montar(<DashboardScreen />);
    await esperar();

    expect(caixa.textContent).toContain(dinheiro('R$ 0,00'));
    expect(caixa.querySelector('table')).toBeNull();
    expect(caixa.querySelector('[aria-label="Estoque atual"]')).toBeNull();
    expect(caixa.querySelector('[aria-label="Ranking de filiais por faturamento"]')).toBeNull();
  });
});

describe('DashboardScreen — cartões variam por perfil sem inventar métrica', () => {
  it('admin não mostra Comissão nem Meta mensal', async () => {
    dev.apiRequest.mockResolvedValue(RESPOSTA_ADMIN);
    montar(<DashboardScreen />);
    await esperar();

    expect(caixa.textContent).not.toContain('Comissão');
    expect(caixa.textContent).not.toContain('Meta mensal');
  });

  it('seller mostra Comissão e Meta mensal usando os valores da API, sem recalcular', async () => {
    dev.apiRequest.mockResolvedValue(RESPOSTA_SELLER);
    montar(<DashboardScreen />);
    await esperar();
    const select = caixa.querySelector('select')!;
    act(() => {
      (select as HTMLSelectElement).value = 'seller';
      select.dispatchEvent(new Event('change', { bubbles: true }));
    });
    act(() => botao('Consultar')?.dispatchEvent(new MouseEvent('click', { bubbles: true })));
    await esperar();

    expect(caixa.textContent).toContain(dinheiro('R$ 3.445,00')); // commissionCentavos
    expect(caixa.textContent).toContain(dinheiro('R$ 150.000,00')); // monthlyGoalCentavos
  });
});

describe('DashboardScreen — ranking de filiais é a mesma coluna Faturamento, reordenada', () => {
  it('ordena por revenueCentavos decrescente, sem introduzir outro critério', async () => {
    dev.apiRequest.mockResolvedValue({
      ...RESPOSTA_ADMIN,
      branches: [
        { ...RESPOSTA_ADMIN.branches[1], branchId: 'menor', revenueCentavos: 100 },
        { ...RESPOSTA_ADMIN.branches[0], branchId: 'maior', revenueCentavos: 900 },
        { ...RESPOSTA_ADMIN.branches[0], branchId: 'meio', revenueCentavos: 500 },
      ],
    });
    montar(<DashboardScreen />);
    await esperar();

    const nomes = [
      ...caixa.querySelectorAll('[aria-label="Ranking de filiais por faturamento"] li'),
    ].map((li) => li.textContent);
    expect(nomes[0]).toContain('maior');
    expect(nomes[1]).toContain('meio');
    expect(nomes[2]).toContain('menor');
  });

  it('não aparece com uma única filial (nada para ranquear)', async () => {
    dev.apiRequest.mockResolvedValue({
      ...RESPOSTA_ADMIN,
      branches: [RESPOSTA_ADMIN.branches[0]],
    });
    montar(<DashboardScreen />);
    await esperar();

    expect(caixa.querySelector('[aria-label="Ranking de filiais por faturamento"]')).toBeNull();
    expect(caixa.querySelector('[aria-label="Comparativo entre filiais"]')).not.toBeNull();
  });
});

describe('DashboardScreen — tabela comparativa preserva os dados da API', () => {
  it('mostra vendas, faturamento e posição atual (a receber/pagar/vencidos) sem recalcular', async () => {
    dev.apiRequest.mockResolvedValue(RESPOSTA_ADMIN);
    montar(<DashboardScreen />);
    await esperar();

    const linhaMatriz = [...caixa.querySelectorAll('tbody tr')].find((tr) =>
      tr.textContent?.includes('matriz'),
    )!;
    // CelulaDeDinheiro separa "R$" do número em spans distintos (fix do NBSP
    // na Fase 4.3) — por isso o textContent junta sem espaço entre os dois.
    expect(linhaMatriz.textContent).toContain('210');
    expect(linhaMatriz.textContent).toContain('R$328.900,00');
    expect(linhaMatriz.textContent).toContain('R$12.845,00');
    expect(linhaMatriz.textContent).toContain('R$8.950,00');
    expect(linhaMatriz.textContent).toContain('R$1.280,00');
  });

  it('estoque atual mostra disponível e sem saldo por filial, independente do período', async () => {
    dev.apiRequest.mockResolvedValue(RESPOSTA_ADMIN);
    montar(<DashboardScreen />);
    await esperar();

    const secao = caixa.querySelector('[aria-label="Estoque atual"]')!;
    expect(secao.textContent).toContain('4820 unidades disponíveis');
    expect(secao.textContent).toContain('6 posições sem saldo');
  });
});
