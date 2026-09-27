import { describe, expect, it } from 'vitest';
import { type ChargeStatus, podeBaixarManualmente, podeCancelar } from './regrasDoBoleto';

/** Fase 5.3 — a matriz STATUS → AÇÕES do legado (`!['PAID','CANCELLED',
 *  'PENDING'].includes(status)` para baixa, `!['PAID','CANCELLED'].includes
 *  (status)` para cancelar) precisa ficar idêntica depois da migração
 *  visual. Estes testes travam a matriz ANTES/DEPOIS status a status. */

const TODOS_OS_STATUS: ChargeStatus[] = ['PENDING', 'REGISTERED', 'PAID', 'OVERDUE', 'CANCELLED'];

describe('podeBaixarManualmente', () => {
  it('reproduz a matriz original: só REGISTERED e OVERDUE permitem baixa manual', () => {
    const resultado = Object.fromEntries(
      TODOS_OS_STATUS.map((status) => [status, podeBaixarManualmente(status)]),
    );
    expect(resultado).toEqual({
      PENDING: false,
      REGISTERED: true,
      PAID: false,
      OVERDUE: true,
      CANCELLED: false,
    });
  });
});

describe('podeCancelar', () => {
  it('reproduz a matriz original: PENDING, REGISTERED e OVERDUE permitem cancelar', () => {
    const resultado = Object.fromEntries(
      TODOS_OS_STATUS.map((status) => [status, podeCancelar(status)]),
    );
    expect(resultado).toEqual({
      PENDING: true,
      REGISTERED: true,
      PAID: false,
      OVERDUE: true,
      CANCELLED: false,
    });
  });
});
