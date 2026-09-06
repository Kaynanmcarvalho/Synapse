import { apiRequest } from '../../lib/dev-auth';

export interface DfeItem {
  readonly numero: number;
  readonly productId: string | null;
  readonly quantidadeMilesimos: number;
  readonly custoUnitarioCentavos: number;
  readonly lote: string | null;
  readonly validade: string | null;
  readonly conferido: boolean;
  readonly observacao: string | null;
}

export interface DfeEntry {
  readonly nota: {
    readonly chaveDeAcesso: string;
    readonly numero: string;
    readonly emitente: { readonly nome: string; readonly cnpj: string };
    readonly valorTotalCentavos: number;
  };
  readonly conferencia: {
    readonly situacao: 'PENDENTE' | 'CONFERIDA' | 'RECUSADA' | 'LANCADA';
    readonly itens: readonly DfeItem[];
  };
  readonly manifestacao: string | null;
}

const json = (body: unknown): RequestInit => ({
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify(body),
});

export const listDfe = () =>
  apiRequest<{ items: DfeEntry[]; nextCursor: string | null; hasMore: boolean }>('/inbound/dfe');
export const importDfe = (xml: string) =>
  apiRequest<DfeEntry>('/inbound/dfe/import', json({ xml }));
export const checkDfeItem = (
  accessKey: string,
  number: number,
  input: Omit<DfeItem, 'numero' | 'conferido' | 'observacao'>,
) =>
  apiRequest<DfeEntry>(`/inbound/dfe/${accessKey}/items/${number}`, {
    ...json(input),
    method: 'PATCH',
  });
export const concludeDfe = (accessKey: string) =>
  apiRequest<DfeEntry>(`/inbound/dfe/${accessKey}/conclude`, json({}));
export const launchDfe = (
  accessKey: string,
  input: { branchId: string; warehouseId: string; supplierId: string; defaultDueDate: string },
) => apiRequest<DfeEntry>(`/inbound/dfe/${accessKey}/launch`, json(input));
