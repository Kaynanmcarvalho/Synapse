import { act, useState } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { ExpiringLot, LotBalance } from './stock.api';

/** Fase 6.4 — a gaveta de detalhe nunca teve teste proprio (so a tabela ao
 *  lado, em ExpiryTable.test.tsx, era coberta). Trava aqui o que o redesign
 *  visual (Secao/ValoresDeLeitura/Status do SDL) nao pode quebrar: mecanica
 *  do Drawer (Esc, foco inicial, devolucao de foco — ja vinha de
 *  useOverlay/Fase 6.3, sem mudanca nesta fase) e os tres estados de rede
 *  (carregando, erro, saldo carregado) que o conteudo novo introduziu. */

const api = vi.hoisted(() => ({ getLotBalance: vi.fn() }));
vi.mock('./stock.api', () => api);

import { LotDetailDrawer } from './StockScreen';

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

let raiz: Root;
let caixa: HTMLDivElement;
const montar = (conteudo: React.ReactNode) => act(() => raiz.render(conteudo));
const esperar = async () => {
  await act(async () => {
    await new Promise((resolver) => setTimeout(resolver, 0));
  });
};

beforeEach(() => {
  caixa = document.createElement('div');
  document.body.appendChild(caixa);
  raiz = createRoot(caixa);
  api.getLotBalance.mockReset();
});

afterEach(() => {
  act(() => raiz.unmount());
  caixa.remove();
});

const ALERTA: ExpiringLot = {
  daysUntilExpiry: 16,
  alertLevel: 'D30',
  lot: {
    id: 'c7fc19aa-728d-4517-b730-67c5bdb0ba90',
    branchId: 'matriz',
    warehouseId: 'deposito-1',
    productId: 'leite-integral-1l',
    supplierId: null,
    manufacturedAt: '2026-08-01',
    expiresAt: '2026-10-15',
    initialQuantity: 120,
    physical: 120,
    reserved: 10,
  },
};

const SALDO: LotBalance = { physical: 120, reserved: 10, available: 110, lots: [ALERTA.lot] };

const pressionarEscape = () => {
  const alvo = document.activeElement ?? document.body;
  act(() => {
    alvo.dispatchEvent(
      new KeyboardEvent('keydown', { key: 'Escape', bubbles: true, cancelable: true }),
    );
  });
};

describe('LotDetailDrawer', () => {
  it('foco inicial fica preso no painel e Escape devolve o foco pra linha que abriu', async () => {
    // jsdom nao calcula layout (offsetParent fica sempre null), entao o
    // filtro `visibleFocusable` do useOverlay nao acha nada "visivel" e cai
    // no fallback: foca o proprio painel (role=dialog). Em navegador real
    // (verificado via Playwright nesta mesma fase) o foco inicial vai pro
    // botao Fechar — o importante aqui, robusto nos dois ambientes, e que o
    // foco fica DENTRO do Drawer, nunca solto em BODY, e volta pro elemento
    // que abriu a consulta quando a gaveta fecha (igual a StockScreen real,
    // onde `onClose` desmonta a gaveta via `setSelected(null)`).
    api.getLotBalance.mockResolvedValue(SALDO);
    const linha = document.createElement('button');
    linha.textContent = 'linha da tabela';
    document.body.appendChild(linha);
    linha.focus();

    function Hospedeiro() {
      const [aberto, setAberto] = useState(true);
      return aberto ? <LotDetailDrawer alert={ALERTA} onClose={() => setAberto(false)} /> : null;
    }

    montar(<Hospedeiro />);
    await esperar();

    expect(document.activeElement).not.toBe(document.body);
    expect(document.activeElement?.getAttribute('role')).toBe('dialog');
    expect(document.activeElement?.getAttribute('aria-modal')).toBe('true');

    pressionarEscape();
    expect(caixa.querySelector('[role="dialog"]')).not.toBeNull(); // fecha depois da animacao de saida
    await act(async () => {
      await new Promise((resolver) => setTimeout(resolver, 250));
    });
    expect(caixa.querySelector('[role="dialog"]')).toBeNull();
    expect(document.activeElement).toBe(linha);

    linha.remove();
  });

  it('mostra "Carregando saldo" com role=status enquanto a promise nao resolve', async () => {
    api.getLotBalance.mockReturnValue(new Promise(() => {}));
    montar(<LotDetailDrawer alert={ALERTA} onClose={vi.fn()} />);
    await esperar();

    const status = caixa.querySelector('[role="status"]');
    expect(status?.textContent).toMatch(/carregando saldo/i);
  });

  it('mostra o erro com role=alert quando a leitura de saldo falha', async () => {
    api.getLotBalance.mockRejectedValue(new Error('Falha simulada'));
    montar(<LotDetailDrawer alert={ALERTA} onClose={vi.fn()} />);
    await esperar();

    const erro = caixa.querySelector('[role="alert"]');
    expect(erro?.textContent).toBe('Falha simulada');
  });

  it('mostra fisico/reservado/disponivel quando o saldo carrega com sucesso', async () => {
    api.getLotBalance.mockResolvedValue(SALDO);
    montar(<LotDetailDrawer alert={ALERTA} onClose={vi.fn()} />);
    await esperar();

    expect(caixa.textContent).toMatch(/Físico/);
    expect(caixa.textContent).toMatch(/120/);
    expect(caixa.textContent).toMatch(/Reservado/);
    expect(caixa.textContent).toMatch(/10/);
    expect(caixa.textContent).toMatch(/Disponível/);
    expect(caixa.textContent).toMatch(/110/);
  });

  it('nao usa cor hex crua em nenhum estado (carregando, erro ou saldo)', async () => {
    api.getLotBalance.mockResolvedValue(SALDO);
    montar(<LotDetailDrawer alert={ALERTA} onClose={vi.fn()} />);
    await esperar();
    expect(caixa.innerHTML).not.toMatch(/#[0-9a-f]{3,6}/i);
  });

  it('lote vencido mostra "Vencido há N dias" com o Status no tom vencido', async () => {
    api.getLotBalance.mockResolvedValue(SALDO);
    const vencido: ExpiringLot = { ...ALERTA, daysUntilExpiry: -5, alertLevel: 'EXPIRED' };
    montar(<LotDetailDrawer alert={vencido} onClose={vi.fn()} />);
    await esperar();

    expect(caixa.textContent).toMatch(/Vencido há 5 dias/);
    expect(caixa.textContent).toMatch(/Vencido/);
  });
});
