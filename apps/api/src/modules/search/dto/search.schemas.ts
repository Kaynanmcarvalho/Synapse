import { z } from 'zod';

export const globalSearchQuerySchema = z.object({
  q: z.string().trim().min(1).max(120),
  limit: z.coerce.number().int().min(1).max(50).default(8),
});
export type GlobalSearchQuery = z.infer<typeof globalSearchQuerySchema>;

export const createSavedFilterSchema = z.object({
  screen: z.string().trim().min(1).max(80),
  name: z.string().trim().min(1).max(80),
  filterState: z.record(z.string(), z.unknown()),
});
export type CreateSavedFilterInput = z.infer<typeof createSavedFilterSchema>;

export const listSavedFiltersQuerySchema = z.object({
  screen: z.string().trim().min(1).max(80),
});
export type ListSavedFiltersQuery = z.infer<typeof listSavedFiltersQuerySchema>;
