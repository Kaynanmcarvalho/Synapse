import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { LinhaDoBoleto } from './BoletosScreen';
import type { ChargeStatus } from './regrasDoBoleto';

/** Fase 5.3 — LinhaDoBoleto isola a Action Grammar (segunda via / baixa
 *  manual / cancelar) fora do corpo de BoletosScreen. Estes testes travam a
 *  matriz STATUS → AÇÕES DISPONÍVEIS renderizada, para não regredir em
 *  relação ao comportamento original (ver regrasDoBoleto.test.ts para a
 *  matriz pura). */

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

let raiz: Root;
let caixa: HTMLDivElement;
const montar = (conteudo: React.ReactNode) => act(() => raiz.render(conteudo));

beforeEach(() => {
  caixa = document.createElement('div');
  document.body.appendChild(caixa);
  raiz = createRoot(caixa);
});

afterEach(() => {
  act(() => raiz.unmount());
  caixa.remove();
});

const CHARGE = (
  status: ChargeStatus,
  bank: { linhaDigitavel: string; pdfUrl: string | null } | null = {
    linhaDigitavel: '123',
    pdfUrl: null,
  },
) => ({
  id: 'boleto-1',
  amountCentavos: 15000,
  dueDate: '2026-10-01',
  status,
  installment: 1,
  bank,
});

const montarLinha = (
  status: ChargeStatus,
  handlers: Partial<{
    aoPedirSegundaVia: (charge: ReturnType<typeof CHARGE>) => void;
    aoIniciarBaixa: (charge: ReturnType<typeof CHARGE>) => void;
    aoCancelar: (charge: ReturnType<typeof CHARGE>) => void;
  }> = {},
) => {
  const charge = CHARGE(status);
  montar(
    <table>
      <tbody>
        <LinhaDoBoleto
          charge={charge}
          busy={false}
          aoPedirSegundaVia={handlers.aoPedirSegundaVia ?? vi.fn()}
          aoIniciarBaixa={handlers.aoIniciarBaixa ?? vi.fn()}
          aoCancelar={handlers.aoCancelar ?? vi.fn()}
        />
      </tbody>
    </table>,
  );
  return charge;
};

describe('LinhaDoBoleto — matriz status → ações visíveis', () => {
  it.each<[ChargeStatus, boolean, boolean]>([
    ['PENDING', false, true],
    ['REGISTERED', true, true],
    ['PAID', false, false],
    ['OVERDUE', true, true],
    ['CANCELLED', false, false],
  ])('status %s: baixa manual visível=%s, cancelar visível=%s', (status, baixa, cancelar) => {
    montarLinha(status);
    const rotulos = Array.from(caixa.querySelectorAll('button')).map((b) => b.textContent);
    expect(rotulos.includes('Baixa manual')).toBe(baixa);
    expect(rotulos.includes('Cancelar')).toBe(cancelar);
    // Segunda via está sempre presente, em todos os status.
    expect(rotulos.includes('Segunda via')).toBe(true);
  });

  it('sem banco vinculado, segunda via fica desabilitada', () => {
    const charge = CHARGE('REGISTERED', null);
    montar(
      <table>
        <tbody>
          <LinhaDoBoleto
            charge={charge}
            busy={false}
            aoPedirSegundaVia={vi.fn()}
            aoIniciarBaixa={vi.fn()}
            aoCancelar={vi.fn()}
          />
        </tbody>
      </table>,
    );
    const botao = Array.from(caixa.querySelectorAll('button')).find(
      (b) => b.textContent === 'Segunda via',
    );
    expect(botao?.disabled).toBe(true);
  });

  it('clicar em "Baixa manual" chama aoIniciarBaixa com o boleto certo', () => {
    const aoIniciarBaixa = vi.fn();
    const charge = montarLinha('OVERDUE', { aoIniciarBaixa });
    const botao = Array.from(caixa.querySelectorAll('button')).find(
      (b) => b.textContent === 'Baixa manual',
    );
    act(() => botao?.dispatchEvent(new MouseEvent('click', { bubbles: true })));
    expect(aoIniciarBaixa).toHaveBeenCalledWith(charge);
  });

  it('clicar em "Cancelar" chama aoCancelar com o boleto certo', () => {
    const aoCancelar = vi.fn();
    const charge = montarLinha('PENDING', { aoCancelar });
    const botao = Array.from(caixa.querySelectorAll('button')).find(
      (b) => b.textContent === 'Cancelar',
    );
    act(() => botao?.dispatchEvent(new MouseEvent('click', { bubbles: true })));
    expect(aoCancelar).toHaveBeenCalledWith(charge);
  });

  it('status usa o componente Status do SDL, sem cor solta', () => {
    montarLinha('OVERDUE');
    expect(caixa.textContent).toContain('Vencido');
    expect(caixa.innerHTML).not.toMatch(/#[0-9a-f]{3,6}/i);
  });

  it('busy desabilita as ações condicionais', () => {
    const charge = CHARGE('OVERDUE');
    montar(
      <table>
        <tbody>
          <LinhaDoBoleto
            charge={charge}
            busy
            aoPedirSegundaVia={vi.fn()}
            aoIniciarBaixa={vi.fn()}
            aoCancelar={vi.fn()}
          />
        </tbody>
      </table>,
    );
    Array.from(caixa.querySelectorAll('button')).forEach((botao) => {
      expect((botao as HTMLButtonElement).disabled).toBe(true);
    });
  });
});
