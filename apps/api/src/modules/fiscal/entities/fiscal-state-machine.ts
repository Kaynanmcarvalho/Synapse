import { ConflictException } from '@nestjs/common';
import type { FiscalDocumentStatus } from '@synapse/types';

const transitions: Record<FiscalDocumentStatus, readonly FiscalDocumentStatus[]> = {
  DRAFT: ['PROCESSING'],
  PROCESSING: ['AUTHORIZED', 'REJECTED', 'DENIED', 'CONTINGENCY'],
  AUTHORIZED: ['CANCELLED'],
  REJECTED: ['PROCESSING'],
  DENIED: [],
  CANCELLED: [],
  CONTINGENCY: ['PROCESSING', 'AUTHORIZED', 'REJECTED'],
};
export function assertFiscalTransition(from: FiscalDocumentStatus, to: FiscalDocumentStatus): void {
  if (!transitions[from].includes(to))
    throw new ConflictException(`Transição fiscal inválida: ${from} -> ${to}`);
}
