import { classifyExpiry } from './lot.service';

describe('classifyExpiry — janelas de alerta do §46 (90, 60, 30, 15 dias)', () => {
  it('classifica vencido quando os dias restantes sao negativos', () => {
    expect(classifyExpiry(-1)).toBe('EXPIRED');
    expect(classifyExpiry(-30)).toBe('EXPIRED');
  });

  it('usa o alerta mais apertado que a validade ja alcancou', () => {
    expect(classifyExpiry(0)).toBe('D15');
    expect(classifyExpiry(10)).toBe('D15');
    expect(classifyExpiry(15)).toBe('D15');
    expect(classifyExpiry(16)).toBe('D30');
    expect(classifyExpiry(30)).toBe('D30');
    expect(classifyExpiry(31)).toBe('D60');
    expect(classifyExpiry(60)).toBe('D60');
    expect(classifyExpiry(61)).toBe('D90');
    expect(classifyExpiry(90)).toBe('D90');
  });

  it('fora de qualquer janela de alerta, nao classifica', () => {
    expect(classifyExpiry(91)).toBeNull();
    expect(classifyExpiry(365)).toBeNull();
  });
});
