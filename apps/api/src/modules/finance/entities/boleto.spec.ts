import { installmentSchema } from '../dto/boleto.schemas';
import { assertPayable, installments, type Charge } from './boleto';

const input = () =>
  installmentSchema.parse({
    accountId: 'a',
    branchId: 'b',
    customerId: 'c',
    description: 'Venda',
    idempotencyKey: 'key',
    totalCentavos: 500000,
    installments: 5,
    firstDueDate: '2026-09-10',
    payer: { nome: 'Cliente', documento: '00000000000' },
  });
describe('Parcelamento de boletos', () => {
  it('divide R$ 5.000 em cinco parcelas mensais de R$ 1.000', () => {
    expect(installments(input())).toEqual(
      ['2026-09-10', '2026-10-10', '2026-11-10', '2026-12-10', '2027-01-10'].map((dueDate) => ({
        dueDate,
        amountCentavos: 100000,
      })),
    );
  });
  it('preserva centavos, aplica desconto e limita dia 31 ao último dia do mês', () => {
    const result = installments({
      ...input(),
      totalCentavos: 1000,
      discountCentavos: 2,
      installments: 3,
      firstDueDate: '2028-01-31',
    });
    expect(result).toEqual([
      { amountCentavos: 333, dueDate: '2028-01-31' },
      { amountCentavos: 333, dueDate: '2028-02-29' },
      { amountCentavos: 332, dueDate: '2028-03-31' },
    ]);
  });
  it('rejeita datas inexistentes e parcelas sem valor', () => {
    expect(() => installmentSchema.parse({ ...input(), firstDueDate: '2026-02-30' })).toThrow();
    expect(() => installments({ ...input(), totalCentavos: 2, installments: 3 })).toThrow();
  });
  it.each(['CANCELLED', 'PENDING'])('não liquida estado %s', (status) => {
    expect(() => assertPayable({ status, amountCentavos: 100 } as Charge, 100)).toThrow();
  });
  it('encaminha valor divergente para conciliação', () => {
    expect(() =>
      assertPayable({ status: 'REGISTERED', amountCentavos: 100 } as Charge, 99),
    ).toThrow(/diverge/);
  });
});
