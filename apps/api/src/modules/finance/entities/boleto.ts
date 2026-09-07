import { BadRequestException } from '@nestjs/common';
import type { Boleto, BankAccountConfig } from '@synapse/types';
import type { InstallmentInput } from '../dto/boleto.schemas';

export type ChargeStatus = 'PENDING' | 'REGISTERED' | 'PAID' | 'OVERDUE' | 'CANCELLED';
export interface Charge {
  id: string;
  tenantId: string;
  branchId: string;
  accountId: string;
  tituloId: string;
  amountCentavos: number;
  dueDate: string;
  status: ChargeStatus;
  bank: Boleto | null;
  input: InstallmentInput;
  installment: number;
  createdAt: string;
}
export interface StoredBankAccount extends BankAccountConfig {
  updatedAt: string;
  updatedBy: string;
}

export function installments(
  input: InstallmentInput,
): Array<{ amountCentavos: number; dueDate: string }> {
  const total = input.totalCentavos - input.discountCentavos;
  if (total < input.installments)
    throw new BadRequestException('Cada parcela deve ter ao menos um centavo');
  const first = new Date(input.firstDueDate + 'T00:00:00Z');
  return Array.from({ length: input.installments }, (_, index) => {
    const end = new Date(Date.UTC(first.getUTCFullYear(), first.getUTCMonth() + index + 1, 0));
    const due = new Date(
      Date.UTC(
        end.getUTCFullYear(),
        end.getUTCMonth(),
        Math.min(first.getUTCDate(), end.getUTCDate()),
      ),
    );
    return {
      amountCentavos:
        Math.floor(total / input.installments) + (index < total % input.installments ? 1 : 0),
      dueDate: due.toISOString().slice(0, 10),
    };
  });
}
export function assertPayable(charge: Charge, amount: number) {
  if (charge.status === 'CANCELLED' || charge.status === 'PENDING')
    throw new BadRequestException('Boleto não pode ser liquidado neste estado');
  if (amount !== charge.amountCentavos)
    throw new BadRequestException('Valor recebido diverge do boleto; encaminhe para conciliação');
}
