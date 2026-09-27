import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import type { VisaoDeCredito } from '../useVisaoDeCredito';
import type { PropsDaAba } from './aba';
import { AbaDocumentos } from './Documentos';

/** Fase 5.4: as três tabelas da aba Documentos do cliente migraram para a
 *  fundação de DataGrid. Travam: vazio por tabela, dinheiro à direita,
 *  vencido sinalizado por `Status` (não por cor solta) e o bloqueio de
 *  permissão, que continua antes de qualquer tabela. */

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

const PROPS = { cliente: { id: 'c1' } } as unknown as PropsDaAba;

const pronto = (carteira: object, ultimasNotas: object[] = []) =>
  ({
    status: 'pronto',
    painel: {
      ultimasNotas,
      carteira: { titulosEmAberto: [], pagamentos: [], ...carteira },
    },
  }) as unknown as VisaoDeCredito;

describe('AbaDocumentos do cliente', () => {
  it('sem permissão do financeiro, não mostra tabela nenhuma', () => {
    montar(<AbaDocumentos {...PROPS} visao={{ status: 'sem-permissao' } as VisaoDeCredito} />);
    expect(caixa.querySelector('table')).toBeNull();
    expect(caixa.textContent).toContain('financeiro.visualizar');
  });

  it('cada tabela vazia mostra a própria mensagem', () => {
    montar(<AbaDocumentos {...PROPS} visao={pronto({})} />);
    expect(caixa.querySelector('table')).toBeNull();
    expect(caixa.textContent).toContain('Nenhuma nota fiscal emitida para este cliente.');
    expect(caixa.textContent).toContain('Nenhum título em aberto em nome deste cliente.');
    expect(caixa.textContent).toContain('Nenhum pagamento registrado.');
  });

  it('título vencido usa Status, e o saldo fica à direita separado do R$', () => {
    montar(
      <AbaDocumentos
        {...PROPS}
        visao={pronto({
          titulosEmAberto: [
            {
              id: 't1',
              numero: '000045',
              parcela: '1/2',
              vencimento: '2026-09-01',
              saldoCentavos: 150_000,
              diasDeAtraso: 12,
            },
          ],
        })}
      />,
    );
    const celulas = [...caixa.querySelectorAll('tbody td')];
    expect(celulas[0]?.textContent).toBe('000045 · 1/2');
    expect(celulas[1]?.textContent).toBe('01/09/2026');
    expect(celulas[2]?.className).toContain('text-right');
    expect(celulas[2]?.textContent?.replace(/\s/g, ' ')).toBe('R$1.500,00');
    expect(celulas[3]?.textContent).toBe('Vencido há 12 dia(s)');
    expect(celulas[3]?.querySelector('.bg-status-vencido-indicador')).not.toBeNull();
    expect(caixa.innerHTML).not.toMatch(/#[0-9a-f]{6}/i);
    expect(caixa.innerHTML).not.toContain('uppercase');
  });
});
