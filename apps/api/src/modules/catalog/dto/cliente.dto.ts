import { z } from 'zod';

/** Filtros da lista de clientes. Tudo opcional: sem filtro, a tela abre com os
 *  últimos cadastrados. */
export const listaDeClientesSchema = z.object({
  q: z.string().trim().max(120).optional(),
  limit: z.coerce.number().int().min(1).max(200).default(50),
  cursor: z.string().trim().max(200).optional(),
  grupo: z.string().trim().max(80).optional(),
  situacao: z.enum(['REGULAR', 'OVERDUE', 'BLOCKED']).optional(),
  /** "ativos", "inativos" ou nada (todos). */
  ativo: z.enum(['ativos', 'inativos']).optional(),
});

export const situacaoFinanceiraSchema = z.object({
  status: z.enum(['REGULAR', 'OVERDUE', 'BLOCKED']),
});

export type ListaDeClientesQuery = z.infer<typeof listaDeClientesSchema>;
export type SituacaoFinanceiraInput = z.infer<typeof situacaoFinanceiraSchema>;
