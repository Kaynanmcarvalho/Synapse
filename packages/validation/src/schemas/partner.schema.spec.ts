import { describe, expect, it } from 'vitest';
import { customerSchema } from './partner.schema';

const base = {
  type: 'PF',
  taxId: '52998224725',
  stateRegistration: null,
  name: 'Maria',
  legalName: null,
  address: {
    street: 'Rua A',
    number: '1',
    complement: null,
    district: 'Centro',
    city: 'Goiânia',
    state: 'go',
    postalCode: '74000000',
  },
  phone: '62999999999',
  creditLimit: 0,
};
describe('customerSchema', () => {
  it('aceita CPF e normaliza UF', () => {
    expect(customerSchema.parse(base).address.state).toBe('GO');
  });
  it('exige IE de produtor rural', () => {
    expect(
      customerSchema.safeParse({ ...base, type: 'RURAL_PRODUCER', taxId: '11222333000181' })
        .success,
    ).toBe(false);
  });
});
