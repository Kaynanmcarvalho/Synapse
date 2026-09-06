import { ConflictException } from '@nestjs/common';
import { assertFiscalTransition } from './fiscal-state-machine';

describe('máquina de estados fiscal', () => {
  it('aceita o ciclo normal e bloqueia transições inválidas', () => {
    expect(() => assertFiscalTransition('DRAFT', 'PROCESSING')).not.toThrow();
    expect(() => assertFiscalTransition('PROCESSING', 'AUTHORIZED')).not.toThrow();
    expect(() => assertFiscalTransition('AUTHORIZED', 'CANCELLED')).not.toThrow();
    expect(() => assertFiscalTransition('CANCELLED', 'AUTHORIZED')).toThrow(ConflictException);
  });
});
