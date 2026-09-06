import { paginationSchema } from '@synapse/validation';
import type { z } from 'zod';

export const paginationDtoSchema = paginationSchema;

export type PaginationDto = z.infer<typeof paginationDtoSchema>;
